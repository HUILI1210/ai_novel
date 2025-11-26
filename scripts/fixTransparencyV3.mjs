/**
 * 使用洪水填充法移除格子背景 V3
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
  console.log('使用洪水填充法移除格子背景 V3...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    // 创建透明度掩码
    const mask = new Uint8Array(width * height).fill(255); // 255=不透明
    
    // 判断像素是否是灰白色（格子颜色）
    const isCheckerColor = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const idx = (y * width + x) * channels;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      // 必须是纯灰色
      const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(r-b));
      if (diff > 5) return false;
      
      const avg = (r + g + b) / 3;
      // 格子颜色范围：190-255（浅灰到白）
      return avg >= 190;
    };
    
    // 从4个角落和边缘进行洪水填充
    const queue = [];
    const visited = new Set();
    
    // 添加边缘像素作为种子点
    for (let x = 0; x < width; x++) {
      if (isCheckerColor(x, 0)) queue.push([x, 0]);
      if (isCheckerColor(x, height-1)) queue.push([x, height-1]);
    }
    for (let y = 0; y < height; y++) {
      if (isCheckerColor(0, y)) queue.push([0, y]);
      if (isCheckerColor(width-1, y)) queue.push([width-1, y]);
    }
    
    console.log(`种子点数量: ${queue.length}`);
    
    // BFS填充
    const directions = [[0,1], [0,-1], [1,0], [-1,0]];
    let fillCount = 0;
    
    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (!isCheckerColor(x, y)) continue;
      
      // 标记为透明
      mask[y * width + x] = 0;
      fillCount++;
      
      // 添加邻居
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
    
    console.log(`填充透明像素: ${fillCount} (${(fillCount / (width * height) * 100).toFixed(1)}%)`);
    
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
