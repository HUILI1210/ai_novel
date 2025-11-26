/**
 * V7 - 只删除精确的格子颜色，不使用洪水填充
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'unnamed-2.jpg');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base.png');

async function fixTransparency() {
  console.log('V7 - 精确格子颜色删除...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    // 分析角落像素，确定格子的精确颜色
    const cornerSamples = [];
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const idx = (y * width + x) * channels;
        cornerSamples.push({
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2]
        });
      }
    }
    
    // 找出格子的两种颜色
    const colorCounts = {};
    for (const c of cornerSamples) {
      const key = `${c.r},${c.g},${c.b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }
    
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    
    console.log('格子颜色:', sortedColors);
    
    // 格子颜色（根据典型的透明格子图案）
    // 浅色: 约 (204, 204, 204) 或 (192, 192, 192)  
    // 白色: 约 (255, 255, 255) 或 (250, 250, 250)
    
    const mask = new Uint8Array(width * height).fill(255);
    
    // 精确匹配格子颜色
    const isExactCheckerColor = (r, g, b) => {
      // 必须是完全的灰色（R=G=B）
      if (r !== g || g !== b) return false;
      
      // 典型格子颜色值：
      // 深灰格子: 204
      // 浅灰/白格子: 255
      return r === 204 || r === 255 || r === 192 || r === 250 || r === 251;
    };
    
    // 更宽松但仍然安全的格子检测
    const isSafeCheckerColor = (r, g, b) => {
      // 必须非常接近灰色
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      if (diff > 2) return false;
      
      const avg = (r + g + b) / 3;
      
      // 精确的格子色值范围
      // 深灰格子: 202-206
      // 白色格子: 248-255
      return (avg >= 202 && avg <= 206) || (avg >= 248);
    };
    
    let exactCount = 0;
    let safeCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pixIdx = idx * channels;
        const r = pixels[pixIdx];
        const g = pixels[pixIdx + 1];
        const b = pixels[pixIdx + 2];
        
        if (isExactCheckerColor(r, g, b)) {
          mask[idx] = 0;
          exactCount++;
        } else if (isSafeCheckerColor(r, g, b)) {
          mask[idx] = 0;
          safeCount++;
        }
      }
    }
    
    console.log(`精确匹配: ${exactCount}, 安全匹配: ${safeCount}`);
    console.log(`总透明: ${exactCount + safeCount} (${((exactCount + safeCount) / (width * height) * 100).toFixed(1)}%)`);
    
    // 从边缘洪水填充清理连通的非角色区域
    const queue = [];
    const visited = new Set();
    
    // 从边缘开始
    for (let x = 0; x < width; x++) {
      if (mask[x] === 0) queue.push([x, 0]);
      if (mask[(height-1) * width + x] === 0) queue.push([x, height-1]);
    }
    for (let y = 0; y < height; y++) {
      if (mask[y * width] === 0) queue.push([0, y]);
      if (mask[y * width + width-1] === 0) queue.push([width-1, y]);
    }
    
    // 判断像素是否可以被清理（灰白色且不是明显的角色颜色）
    const canClean = (x, y) => {
      const idx = (y * width + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      // 保护金色/黄色（头发）
      if (r > g && g > b && (r - b) > 15) return false;
      // 保护肤色
      if (r > 180 && g > 140 && b > 100 && r > g && g > b) return false;
      
      // 灰白色可以清理
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      const avg = (r + g + b) / 3;
      return diff <= 10 && avg >= 180;
    };
    
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    let floodCount = 0;
    
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      const idx = y * width + x;
      
      // 如果已透明，扩展到邻居
      if (mask[idx] === 0) {
        for (const [dx, dy] of directions) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nkey = `${nx},${ny}`;
            if (!visited.has(nkey)) {
              const nIdx = ny * width + nx;
              if (mask[nIdx] === 0 || canClean(nx, ny)) {
                queue.push([nx, ny]);
              }
            }
          }
        }
      } else if (canClean(x, y)) {
        // 清理这个像素
        mask[idx] = 0;
        floodCount++;
        for (const [dx, dy] of directions) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nkey = `${nx},${ny}`;
            if (!visited.has(nkey)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
    
    console.log(`洪水填充清理: ${floodCount}`);
    
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
