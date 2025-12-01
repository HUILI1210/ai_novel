import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

// 配置
const CONFIG = {
  quality: 80,           // WebP质量 (0-100)
  jpegQuality: 85,       // JPEG压缩质量
  maxWidth: 1920,        // 最大宽度
  maxHeight: 1080,       // 最大高度
  generateThumbnail: true,
  thumbnailWidth: 480,   // 缩略图宽度
};

// 统计信息
let stats = {
  processed: 0,
  saved: 0,
  originalSize: 0,
  optimizedSize: 0,
};

// 递归获取所有图片文件
function getImageFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getImageFiles(fullPath, files);
    } else if (/\.(png|jpg|jpeg)$/i.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 优化单张图片
async function optimizeImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);
  const webpPath = path.join(dir, `${baseName}.webp`);
  const thumbPath = path.join(dir, `${baseName}_thumb.webp`);
  
  const originalSize = fs.statSync(inputPath).size;
  stats.originalSize += originalSize;
  
  try {
    let image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // 如果图片太大，先调整尺寸
    if (metadata.width > CONFIG.maxWidth || metadata.height > CONFIG.maxHeight) {
      image = image.resize(CONFIG.maxWidth, CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // 生成 WebP 版本
    await image
      .webp({ quality: CONFIG.quality })
      .toFile(webpPath);
    
    const webpSize = fs.statSync(webpPath).size;
    stats.optimizedSize += webpSize;
    
    // 生成缩略图（用于预加载）
    if (CONFIG.generateThumbnail) {
      await sharp(inputPath)
        .resize(CONFIG.thumbnailWidth, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 60 })
        .toFile(thumbPath);
    }
    
    // 压缩原始 PNG/JPEG（保留兼容性）
    if (ext === '.png') {
      await sharp(inputPath)
        .png({ compressionLevel: 9, palette: true })
        .toFile(inputPath + '.tmp');
      fs.renameSync(inputPath + '.tmp', inputPath);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      await sharp(inputPath)
        .jpeg({ quality: CONFIG.jpegQuality, mozjpeg: true })
        .toFile(inputPath + '.tmp');
      fs.renameSync(inputPath + '.tmp', inputPath);
    }
    
    const savedKB = ((originalSize - webpSize) / 1024).toFixed(1);
    const savedPercent = (((originalSize - webpSize) / originalSize) * 100).toFixed(1);
    
    console.log(`✅ ${path.relative(publicDir, inputPath)}`);
    console.log(`   原始: ${(originalSize/1024).toFixed(1)}KB → WebP: ${(webpSize/1024).toFixed(1)}KB (节省 ${savedPercent}%)`);
    
    stats.processed++;
    stats.saved += originalSize - webpSize;
    
  } catch (error) {
    console.error(`❌ 处理失败: ${inputPath}`, error.message);
  }
}

// 主函数
async function main() {
  console.log('🖼️  开始优化图片...\n');
  
  const storiesDir = path.join(publicDir, 'stories');
  
  if (!fs.existsSync(storiesDir)) {
    console.log('未找到 stories 目录');
    return;
  }
  
  const images = getImageFiles(storiesDir);
  console.log(`找到 ${images.length} 张图片\n`);
  
  for (const imagePath of images) {
    await optimizeImage(imagePath);
  }
  
  console.log('\n📊 优化统计:');
  console.log(`   处理图片: ${stats.processed} 张`);
  console.log(`   原始总大小: ${(stats.originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   优化后总大小: ${(stats.optimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   总共节省: ${(stats.saved / 1024 / 1024).toFixed(2)} MB (${((stats.saved / stats.originalSize) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
