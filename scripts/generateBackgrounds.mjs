/**
 * 背景生成脚本 - 使用简化的英文提示词
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DASHSCOPE_API_KEY = 'sk-c6870ab7cb454f45839cfc3529c4c44d';
const DASHSCOPE_API_BASE = 'https://dashscope.aliyuncs.com/api/v1';
const DASHSCOPE_IMAGE_MODEL = 'wanx-v1';

const BACKGROUNDS_DIR = path.join(__dirname, '..', 'public', 'backgrounds');

// 简化的英文提示词
const BACKGROUNDS = [
  { name: 'school_rooftop', prompt: 'anime school rooftop sunset sky clouds fence city view, beautiful lighting, detailed background, no people' },
  { name: 'classroom', prompt: 'anime classroom interior desks windows sunlight afternoon, detailed background art, no people' },
  { name: 'school_gate', prompt: 'anime school gate entrance cherry blossom trees spring day, beautiful scenery, no people' },
  { name: 'school_corridor', prompt: 'anime school hallway corridor windows sunlight clean floor, detailed interior, no people' },
  { name: 'library', prompt: 'anime library interior bookshelves reading tables warm lighting, cozy atmosphere, no people' },
  { name: 'street_sunset', prompt: 'anime japanese residential street sunset power lines shops, warm orange sky, no people' },
  { name: 'riverside', prompt: 'anime riverside path cherry blossom trees sunset water reflection, romantic scenery, no people' },
  { name: 'convenience_store', prompt: 'anime convenience store interior bright lights shelves night, detailed background, no people' },
  { name: 'park_night', prompt: 'anime city park night street lamps bench stars trees, peaceful atmosphere, no people' },
  { name: 'cafe', prompt: 'anime cafe interior wooden furniture warm lights cozy afternoon, detailed interior, no people' },
  { name: 'train_station', prompt: 'anime train station platform evening sky tracks waiting area, urban scenery, no people' },
  { name: 'bedroom', prompt: 'anime girl bedroom interior bed desk window curtains cozy, warm lighting, no people' }
];

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ ${path.basename(outputPath)}`);
        resolve();
      });
    }).on('error', reject);
  });
}

async function generateImage(prompt) {
  try {
    const submitResponse = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify({
        model: DASHSCOPE_IMAGE_MODEL,
        input: { prompt },
        parameters: { size: '1024*1024', n: 1 }
      })
    });

    if (!submitResponse.ok) return null;
    const submitData = await submitResponse.json();
    const taskId = submitData.output?.task_id;
    if (!taskId) return null;

    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(`${DASHSCOPE_API_BASE}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` }
      });
      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.output?.task_status;
      process.stdout.write(`\r  ${status} (${i + 1}/60)   `);

      if (status === 'SUCCEEDED') {
        console.log('');
        return statusData.output?.results?.[0]?.url;
      } else if (status === 'FAILED') {
        console.log(' FAILED');
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

async function main() {
  console.log('生成场景背景...\n');
  ensureDirectoryExists(BACKGROUNDS_DIR);
  
  for (let i = 0; i < BACKGROUNDS.length; i++) {
    const bg = BACKGROUNDS[i];
    const outputPath = path.join(BACKGROUNDS_DIR, `${bg.name}.png`);
    
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${BACKGROUNDS.length}] ${bg.name} - 已存在`);
      continue;
    }
    
    console.log(`[${i + 1}/${BACKGROUNDS.length}] ${bg.name}`);
    const url = await generateImage(bg.prompt);
    
    if (url) {
      await downloadImage(url, outputPath);
    } else {
      console.log(`  ✗ 生成失败`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n完成!');
}

main();
