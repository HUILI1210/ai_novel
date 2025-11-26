/**
 * 移除格子背景，转换为透明PNG
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base.png');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base_clean.png');

async function removeCheckerboard() {
  console.log('处理图片，移除格子背景...');
  
  try {
    const image = sharp(INPUT_PATH);
    const { width, height } = await image.metadata();
    
    // 获取原始像素数据
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = new Uint8Array(data);
    const channels = info.channels;
    
    // 创建新的RGBA缓冲区
    const newPixels = new Uint8Array(width * height * 4);
    
    // 格子颜色 (浅灰和白)
    const isCheckerColor = (r, g, b) => {
      // 浅灰格子 ~204,204,204 或白色 ~255,255,255
      const isLightGray = r > 190 && r < 220 && g > 190 && g < 220 && b > 190 && b < 220;
      const isWhite = r > 245 && g > 245 && b > 245;
      return isLightGray || isWhite;
    };
    
    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * channels;
      const dstIdx = i * 4;
      
      const r = pixels[srcIdx];
      const g = pixels[srcIdx + 1];
      const b = pixels[srcIdx + 2];
      
      if (isCheckerColor(r, g, b)) {
        // 格子背景 -> 透明
        newPixels[dstIdx] = 0;
        newPixels[dstIdx + 1] = 0;
        newPixels[dstIdx + 2] = 0;
        newPixels[dstIdx + 3] = 0;
      } else {
        // 保留原色
        newPixels[dstIdx] = r;
        newPixels[dstIdx + 1] = g;
        newPixels[dstIdx + 2] = b;
        newPixels[dstIdx + 3] = 255;
      }
    }
    
    // 保存为透明PNG
    await sharp(Buffer.from(newPixels), {
      raw: { width, height, channels: 4 }
    })
      .png()
      .toFile(OUTPUT_PATH);
    
    console.log('✓ 已保存到:', OUTPUT_PATH);
    
    // 替换原文件
    const fs = await import('fs');
    fs.renameSync(OUTPUT_PATH, INPUT_PATH);
    console.log('✓ 已替换原文件');
    
  } catch (error) {
    console.error('处理失败:', error);
  }
}

removeCheckerboard();
