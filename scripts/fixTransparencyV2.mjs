/**
 * 精确移除格子背景 V2 - 只检测真正的格子图案
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
  console.log('精确移除格子背景 V2...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    // 创建新的RGBA缓冲区
    const newPixels = new Uint8Array(width * height * 4);
    
    // 格子图案的特征：两种交替的灰色
    // 典型值：浅灰(~204,204,204) 和 白色(~255,255,255)
    // 或 浅灰(~192,192,192) 和 深灰(~128,128,128)
    
    // 检测格子颜色（分析图片角落像素）
    const cornerPixels = [];
    const corners = [[0,0], [width-1,0], [0,height-1], [width-1,height-1]];
    for (const [x, y] of corners) {
      const idx = (y * width + x) * channels;
      cornerPixels.push({
        r: pixels[idx],
        g: pixels[idx + 1],
        b: pixels[idx + 2]
      });
    }
    
    console.log('角落像素颜色:', cornerPixels);
    
    // 只移除真正的格子区域（非常保守的判断）
    let transparentCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const srcIdx = i * channels;
        const dstIdx = i * 4;
        
        const r = pixels[srcIdx];
        const g = pixels[srcIdx + 1];
        const b = pixels[srcIdx + 2];
        
        // 严格判断：必须是纯灰色（R=G=B），且在特定范围
        const isGray = Math.abs(r - g) <= 2 && Math.abs(g - b) <= 2 && Math.abs(r - b) <= 2;
        const avg = (r + g + b) / 3;
        
        // 只移除典型的格子颜色：
        // 1. 纯白 (250-255)
        // 2. 浅灰 (200-210) - 典型格子深色
        // 3. 检查是否在边缘或角落区域
        const isCheckerWhite = isGray && avg >= 250;
        const isCheckerGray = isGray && avg >= 195 && avg <= 210;
        
        // 额外检查：边缘区域更可能是格子
        const isEdgeArea = x < 50 || x > width - 50 || y < 50 || y > height - 50;
        const isCenterArea = x > 200 && x < width - 200 && y > 100 && y < height - 100;
        
        // 判断是否是格子
        let isChecker = false;
        if (isCheckerWhite || isCheckerGray) {
          if (isEdgeArea) {
            // 边缘区域的灰白色更可能是格子
            isChecker = true;
          } else if (!isCenterArea && isCheckerWhite) {
            // 非中心区域的纯白也可能是格子
            isChecker = true;
          }
        }
        
        if (isChecker) {
          newPixels[dstIdx] = 0;
          newPixels[dstIdx + 1] = 0;
          newPixels[dstIdx + 2] = 0;
          newPixels[dstIdx + 3] = 0;
          transparentCount++;
        } else {
          newPixels[dstIdx] = r;
          newPixels[dstIdx + 1] = g;
          newPixels[dstIdx + 2] = b;
          newPixels[dstIdx + 3] = 255;
        }
      }
    }
    
    console.log(`处理完成: ${transparentCount} 个像素设为透明 (${(transparentCount / (width * height) * 100).toFixed(1)}%)`);
    
    await sharp(Buffer.from(newPixels), {
      raw: { width, height, channels: 4 }
    }).png().toFile(OUTPUT_PATH);
    
    console.log('✓ 已保存到:', OUTPUT_PATH);
    
    const stats = fs.statSync(OUTPUT_PATH);
    console.log(`文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

fixTransparency();
