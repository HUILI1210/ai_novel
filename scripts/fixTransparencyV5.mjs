/**
 * 平衡的洪水填充法 V5 - 更好的阈值
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'unnamed-2.jpg');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base.png');

async function fixTransparency() {
  console.log('平衡的洪水填充法 V5...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    const mask = new Uint8Array(width * height).fill(255);
    
    // 更宽的颜色判断
    const isCheckerColor = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const idx = (y * width + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      // 灰度差异不超过5
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      if (diff > 5) return false;
      
      const avg = (r + g + b) / 3;
      
      // 格子颜色范围：195-215（浅灰）或 235-255（白）
      return (avg >= 195 && avg <= 215) || (avg >= 235);
    };
    
    // 从边缘开始填充
    const queue = [];
    const visited = new Set();
    
    for (let x = 0; x < width; x++) {
      if (isCheckerColor(x, 0)) queue.push([x, 0]);
      if (isCheckerColor(x, height-1)) queue.push([x, height-1]);
    }
    for (let y = 0; y < height; y++) {
      if (isCheckerColor(0, y)) queue.push([0, y]);
      if (isCheckerColor(width-1, y)) queue.push([width-1, y]);
    }
    
    console.log(`种子点数量: ${queue.length}`);
    
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    let fillCount = 0;
    
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (!isCheckerColor(x, y)) continue;
      
      mask[y * width + x] = 0;
      fillCount++;
      
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nkey = `${nx},${ny}`;
          if (!visited.has(nkey)) {
            queue.push([nx, ny]);
          }
        }
      }
    }
    
    console.log(`第一轮填充: ${fillCount} (${(fillCount / (width * height) * 100).toFixed(1)}%)`);
    
    // 第二轮：填充被包围的格子区域（从右下角）
    const queue2 = [];
    for (let x = width - 1; x >= 0; x--) {
      if (isCheckerColor(x, 0) && mask[x] === 255) queue2.push([x, 0]);
      if (isCheckerColor(x, height-1) && mask[(height-1) * width + x] === 255) queue2.push([x, height-1]);
    }
    for (let y = height - 1; y >= 0; y--) {
      if (isCheckerColor(0, y) && mask[y * width] === 255) queue2.push([0, y]);
      if (isCheckerColor(width-1, y) && mask[y * width + width-1] === 255) queue2.push([width-1, y]);
    }
    
    let fillCount2 = 0;
    while (queue2.length > 0) {
      const [x, y] = queue2.shift();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (!isCheckerColor(x, y)) continue;
      
      mask[y * width + x] = 0;
      fillCount2++;
      
      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nkey = `${nx},${ny}`;
          if (!visited.has(nkey)) {
            queue2.push([nx, ny]);
          }
        }
      }
    }
    
    console.log(`第二轮填充: ${fillCount2}`);
    console.log(`总透明像素: ${fillCount + fillCount2} (${((fillCount + fillCount2) / (width * height) * 100).toFixed(1)}%)`);
    
    // 第三轮：多次清理孤立的灰色块
    let totalCleanCount = 0;
    for (let pass = 0; pass < 10; pass++) {
      let cleanCount = 0;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          if (mask[idx] === 255) {
            // 检查周围8个像素
            let transparentNeighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                if (mask[(y+dy) * width + (x+dx)] === 0) transparentNeighbors++;
              }
            }
            // 如果周围有透明邻居，且自己是灰色
            if (transparentNeighbors >= 3) {
              const pixIdx = idx * channels;
              const r = pixels[pixIdx];
              const g = pixels[pixIdx + 1];
              const b = pixels[pixIdx + 2];
              const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
              const avg = (r + g + b) / 3;
              // 灰色范围
              if (diff <= 8 && ((avg >= 190 && avg <= 220) || avg >= 240)) {
                mask[idx] = 0;
                cleanCount++;
              }
            }
          }
        }
      }
      totalCleanCount += cleanCount;
      if (cleanCount === 0) break;
    }
    console.log(`清理孤立块: ${totalCleanCount}`);
    
    // 第四轮：直接移除所有孤立的深灰块（特定灰度）
    let directClean = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 255) {
          const pixIdx = idx * channels;
          const r = pixels[pixIdx];
          const g = pixels[pixIdx + 1];
          const b = pixels[pixIdx + 2];
          const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
          const avg = (r + g + b) / 3;
          
          // 精确匹配格子的深灰色：203-208
          if (diff <= 2 && avg >= 203 && avg <= 208) {
            // 检查是否不在角色区域（检查周围是否有非灰色像素）
            let hasColorNeighbor = false;
            for (let dy = -2; dy <= 2 && !hasColorNeighbor; dy++) {
              for (let dx = -2; dx <= 2 && !hasColorNeighbor; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = (ny * width + nx) * channels;
                  const nr = pixels[nIdx];
                  const ng = pixels[nIdx + 1];
                  const nb = pixels[nIdx + 2];
                  const nDiff = Math.max(Math.abs(nr-ng), Math.abs(ng-nb), Math.abs(nr-nb));
                  const nAvg = (nr + ng + nb) / 3;
                  // 如果邻居是彩色或者深色（角色的一部分）
                  if (nDiff > 15 || nAvg < 150) {
                    hasColorNeighbor = true;
                  }
                }
              }
            }
            if (!hasColorNeighbor) {
              mask[idx] = 0;
              directClean++;
            }
          }
        }
      }
    }
    console.log(`直接清理深灰块: ${directClean}`);
    
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
