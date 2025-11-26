/**
 * V8 - 完美抠图 + 边缘羽化
 * 1. 精确识别格子颜色
 * 2. 完整保留角色
 * 3. 边缘羽化使融合更自然
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'unnamed-2.jpg');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base.png');

async function fixTransparency() {
  console.log('V8 - 完美抠图 + 边缘羽化...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    const mask = new Uint8Array(width * height).fill(255);
    
    // ========== 第1步：识别格子背景 ==========
    // 精确匹配格子颜色 (从原图左上角采样得知是 205,205,205 和 255,255,255)
    const isCheckerPixel = (r, g, b) => {
      // 必须是纯灰色
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      if (diff > 2) return false;
      
      const avg = (r + g + b) / 3;
      // 精确匹配格子的两种颜色
      return (avg >= 203 && avg <= 207) || (avg >= 253);
    };
    
    // 标记所有格子像素
    let checkerCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixIdx = idx * channels;
        const r = pixels[pixIdx];
        const g = pixels[pixIdx + 1];
        const b = pixels[pixIdx + 2];
        
        if (isCheckerPixel(r, g, b)) {
          mask[idx] = 0;
          checkerCount++;
        }
      }
    }
    console.log(`格子像素: ${checkerCount} (${(checkerCount / (width * height) * 100).toFixed(1)}%)`);
    
    // ========== 第2步：从边缘洪水填充，只清理与边缘连通的格子 ==========
    // 这确保角色内部的浅色区域不会被误删
    const isConnectedToEdge = new Uint8Array(width * height);
    const queue = [];
    
    // 从四边开始
    for (let x = 0; x < width; x++) {
      if (mask[x] === 0) { queue.push([x, 0]); isConnectedToEdge[x] = 1; }
      const bottomIdx = (height-1) * width + x;
      if (mask[bottomIdx] === 0) { queue.push([x, height-1]); isConnectedToEdge[bottomIdx] = 1; }
    }
    for (let y = 0; y < height; y++) {
      const leftIdx = y * width;
      if (mask[leftIdx] === 0) { queue.push([0, y]); isConnectedToEdge[leftIdx] = 1; }
      const rightIdx = y * width + width - 1;
      if (mask[rightIdx] === 0) { queue.push([width-1, y]); isConnectedToEdge[rightIdx] = 1; }
    }
    
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    
    // 判断是否可以扩展到这个像素
    const canExpand = (x, y) => {
      const idx = (y * width + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      // 保护金色/黄色（头发）
      if (r > g && g > b && (r - b) > 15) return false;
      // 保护肤色
      if (r > 180 && g > 140 && b > 100 && r > g && g > b) return false;
      // 保护深色像素
      const avg = (r + g + b) / 3;
      if (avg < 150) return false;
      
      // 灰白色可以扩展
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      return diff <= 12 && avg >= 180;
    };
    
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!isConnectedToEdge[nIdx]) {
            // 如果已标记为格子，或者可以扩展
            if (mask[nIdx] === 0 || canExpand(nx, ny)) {
              isConnectedToEdge[nIdx] = 1;
              mask[nIdx] = 0;  // 标记为透明
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
    
    // 只保留与边缘连通的透明区域
    let finalTransparent = 0;
    for (let i = 0; i < width * height; i++) {
      if (mask[i] === 0 && !isConnectedToEdge[i]) {
        // 这个格子像素不与边缘连通，恢复为不透明（可能是角色内部）
        mask[i] = 255;
      } else if (mask[i] === 0) {
        finalTransparent++;
      }
    }
    console.log(`最终透明: ${finalTransparent} (${(finalTransparent / (width * height) * 100).toFixed(1)}%)`);
    
    // ========== 第3步：边缘羽化 ==========
    // 找到角色边缘，对边缘像素应用渐变透明度
    const tempMask = new Uint8Array(mask);
    
    // 多轮羽化，从外到内逐渐降低透明度
    const featherLevels = [
      { alpha: 60, range: 1 },   // 最外层：60% 透明
      { alpha: 120, range: 2 },  // 第二层：约50% 透明
      { alpha: 180, range: 3 },  // 第三层：约30% 透明
      { alpha: 220, range: 4 },  // 第四层：约15% 透明
    ];
    
    let featheredCount = 0;
    
    for (const level of featherLevels) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          
          // 只处理当前不透明的像素
          if (tempMask[idx] === 255) {
            // 检查周围是否有透明像素
            let hasTransparentNeighbor = false;
            
            for (let dy = -level.range; dy <= level.range; dy++) {
              for (let dx = -level.range; dx <= level.range; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  if (mask[ny * width + nx] === 0) {
                    hasTransparentNeighbor = true;
                    break;
                  }
                }
              }
              if (hasTransparentNeighbor) break;
            }
            
            if (hasTransparentNeighbor) {
              // 检查这个像素是否是灰白色边缘（可能是残留的格子边缘）
              const pixIdx = idx * channels;
              const r = pixels[pixIdx];
              const g = pixels[pixIdx + 1];
              const b = pixels[pixIdx + 2];
              const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
              const avg = (r + g + b) / 3;
              
              // 如果是灰白色边缘像素，应用羽化
              if (diff <= 15 && avg >= 180) {
                tempMask[idx] = level.alpha;
                featheredCount++;
              }
            }
          }
        }
      }
    }
    
    console.log(`边缘羽化: ${featheredCount} 像素`);
    
    // ========== 第4步：创建最终图片 ==========
    const newPixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * channels;
      const dstIdx = i * 4;
      
      newPixels[dstIdx] = pixels[srcIdx];
      newPixels[dstIdx + 1] = pixels[srcIdx + 1];
      newPixels[dstIdx + 2] = pixels[srcIdx + 2];
      newPixels[dstIdx + 3] = tempMask[i];
    }
    
    await sharp(Buffer.from(newPixels), {
      raw: { width, height, channels: 4 }
    }).png().toFile(OUTPUT_PATH);
    
    console.log('✓ 已保存到', OUTPUT_PATH);
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

fixTransparency();
