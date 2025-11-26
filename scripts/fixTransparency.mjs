/**
 * 彻底移除格子背景 - 改进版
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
  console.log('重新处理图片，彻底移除格子背景...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    console.log(`图片尺寸: ${width}x${height}`);
    
    // 获取原始像素数据
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    // 创建新的RGBA缓冲区
    const newPixels = new Uint8Array(width * height * 4);
    
    // 格子背景的两种颜色（更精确的范围）
    // 浅色格子: RGB约为 (204, 204, 204) 或 (192, 192, 192)
    // 深色格子: RGB约为 (153, 153, 153) 或 (128, 128, 128)
    // 白色: RGB约为 (255, 255, 255)
    const isCheckerPattern = (r, g, b, x, y) => {
      // 检查是否是灰色系（R≈G≈B）
      const isGrayish = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
      
      if (!isGrayish) return false;
      
      // 格子颜色范围
      const avg = (r + g + b) / 3;
      
      // 浅灰/白色 (180-255)
      if (avg > 180) return true;
      
      // 中灰 (120-180) - 格子的深色部分
      if (avg > 120 && avg < 180) return true;
      
      return false;
    };
    
    let transparentCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const srcIdx = i * channels;
        const dstIdx = i * 4;
        
        const r = pixels[srcIdx];
        const g = pixels[srcIdx + 1];
        const b = pixels[srcIdx + 2];
        
        if (isCheckerPattern(r, g, b, x, y)) {
          // 格子背景 -> 完全透明
          newPixels[dstIdx] = 0;
          newPixels[dstIdx + 1] = 0;
          newPixels[dstIdx + 2] = 0;
          newPixels[dstIdx + 3] = 0;
          transparentCount++;
        } else {
          // 保留原色，完全不透明
          newPixels[dstIdx] = r;
          newPixels[dstIdx + 1] = g;
          newPixels[dstIdx + 2] = b;
          newPixels[dstIdx + 3] = 255;
        }
      }
    }
    
    console.log(`处理完成: ${transparentCount} 个像素设为透明`);
    
    // 保存为透明PNG
    await sharp(Buffer.from(newPixels), {
      raw: { width, height, channels: 4 }
    })
      .png()
      .toFile(OUTPUT_PATH);
    
    console.log('✓ 已保存到:', OUTPUT_PATH);
    
    // 验证文件
    const stats = fs.statSync(OUTPUT_PATH);
    console.log(`文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

fixTransparency();
