/**
 * 混合方案 V6 - 先检测角色，再移除背景
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'unnamed-2.jpg');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base.png');

async function fixTransparency() {
  console.log('混合方案 V6...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    const mask = new Uint8Array(width * height).fill(255);
    
    // 步骤1：标记"确定是角色"的像素（彩色或深色）
    const isDefinitelyCharacter = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      const avg = (r + g + b) / 3;
      
      // 彩色像素（肤色、金发等）或深色像素
      if (diff > 20 || avg < 150) {
        isDefinitelyCharacter[i] = 1;
      }
    }
    
    // 步骤2：扩展角色区域（周围1像素，更小的保护区）
    const characterZone = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (isDefinitelyCharacter[idx]) {
          // 标记周围区域（仅1像素）
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                characterZone[ny * width + nx] = 1;
              }
            }
          }
        }
      }
    }
    console.log(`角色保护区像素: ${characterZone.filter(x => x).length}`);
    
    // 步骤3：格子颜色判断（严格，保护浅金发）
    const isCheckerColor = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const idx = (y * width + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      // 保护任何有黄色倾向的像素（包括浅金色）
      // 黄色特征：R >= G > B，或者 R 和 G 都高于 B
      if (r >= g && g > b && (r - b) > 10) return false;
      if (r > 200 && g > 180 && b < g) return false;  // 浅金色
      
      // 必须是纯灰色（R≈G≈B，差异很小）
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      if (diff > 3) return false;  // 更严格的灰度判断
      
      const avg = (r + g + b) / 3;
      // 只匹配典型的格子颜色：205左右的浅灰 或 250以上的白色
      return (avg >= 200 && avg <= 210) || avg >= 248;
    };
    
    // 步骤4：从边缘洪水填充，但不进入角色保护区
    const queue = [];
    const visited = new Set();
    
    for (let x = 0; x < width; x++) {
      if (isCheckerColor(x, 0) && !characterZone[x]) queue.push([x, 0]);
      if (isCheckerColor(x, height-1) && !characterZone[(height-1) * width + x]) queue.push([x, height-1]);
    }
    for (let y = 0; y < height; y++) {
      if (isCheckerColor(0, y) && !characterZone[y * width]) queue.push([0, y]);
      if (isCheckerColor(width-1, y) && !characterZone[y * width + width-1]) queue.push([width-1, y]);
    }
    
    console.log(`种子点: ${queue.length}`);
    
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    let fillCount = 0;
    
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;
      const idx = y * width + x;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // 不进入角色保护区
      if (characterZone[idx]) continue;
      if (!isCheckerColor(x, y)) continue;
      
      mask[idx] = 0;
      fillCount++;
      
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nkey = `${nx},${ny}`;
          if (!visited.has(nkey) && !characterZone[ny * width + nx]) {
            queue.push([nx, ny]);
          }
        }
      }
    }
    
    console.log(`洪水填充: ${fillCount} (${(fillCount / (width * height) * 100).toFixed(1)}%)`);
    
    // 步骤5：清理剩余的孤立灰块（角色保护区外）
    let cleanCount = 0;
    for (let pass = 0; pass < 15; pass++) {
      let passClean = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (mask[idx] === 255 && !characterZone[idx]) {
            let transparentNeighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (mask[(y+dy) * width + (x+dx)] === 0) transparentNeighbors++;
              }
            }
            if (transparentNeighbors >= 2 && isCheckerColor(x, y)) {
              mask[idx] = 0;
              passClean++;
            }
          }
        }
      }
      cleanCount += passClean;
      if (passClean === 0) break;
    }
    console.log(`清理孤立块: ${cleanCount}`);
    
    // 步骤6：多轮边缘羽化 - 清理角色边缘的灰色像素
    let totalEdgeClean = 0;
    for (let pass = 0; pass < 5; pass++) {
      let edgeClean = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (mask[idx] === 255) {
            // 检查是否在透明像素旁边
            let transparentCount = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  if (mask[ny * width + nx] === 0) transparentCount++;
                }
              }
            }
            
            if (transparentCount >= 1) {
              const pixIdx = idx * channels;
              const r = pixels[pixIdx];
              const g = pixels[pixIdx + 1];
              const b = pixels[pixIdx + 2];
              const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
              const avg = (r + g + b) / 3;
              
              // 灰白色边缘像素设为透明，但保护金发
              // 检测是否是金色/黄色（头发颜色）
              const isGoldish = r > g && g > b && (r - b) > 30;
              const isYellowish = r > 180 && g > 150 && b < 150 && (r - b) > 40;
              
              // 只删除真正的灰色，不删除金色头发
              if (!isGoldish && !isYellowish) {
                const isGrayish = diff <= 15 && avg >= 180;
                const isVeryLight = avg >= 230 && diff <= 20;
                
                if (isGrayish || isVeryLight) {
                  mask[idx] = 0;
                  edgeClean++;
                }
              }
            }
          }
        }
      }
      totalEdgeClean += edgeClean;
      if (edgeClean === 0) break;
    }
    console.log(`边缘清理: ${totalEdgeClean}`);
    
    // 创建最终图片
    const newPixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * channels;
      const dstIdx = i * 4;
      
      newPixels[dstIdx] = pixels[srcIdx];
      newPixels[dstIdx + 1] = pixels[srcIdx + 1];
      newPixels[dstIdx + 2] = pixels[srcIdx + 2];
      newPixels[dstIdx + 3] = mask[i];
    }
    
    await sharp(Buffer.from(newPixels), {
      raw: { width, height, channels: 4 }
    }).png().toFile(OUTPUT_PATH);
    
    console.log('✓ 已保存');
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

fixTransparency();
