/**
 * 为公主剧本生成奇幻王国风格背景
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

const BACKGROUNDS_DIR = path.join(__dirname, '..', 'public', 'backgrounds');

// 公主剧本场景背景
const PRINCESS_BACKGROUNDS = [
  { name: 'palace_hall', prompt: 'Grand medieval palace throne room interior, golden decorations, red carpet, stained glass windows, sunlight streaming through, majestic pillars, anime style background, no people, high quality' },
  { name: 'palace_garden', prompt: 'Beautiful palace garden at night, moonlight, roses and flowers, stone fountain, romantic atmosphere, medieval European style, anime background, no people' },
  { name: 'palace_balcony', prompt: 'Palace balcony overlooking kingdom, sunset sky, golden hour light, medieval castle architecture, distant mountains, anime style background, no people' },
  { name: 'castle_corridor', prompt: 'Medieval castle corridor, stone walls, torch lighting, elegant tapestries, arched windows, mysterious atmosphere, anime style background, no people' },
  { name: 'royal_bedroom', prompt: 'Luxurious royal princess bedroom, canopy bed, soft curtains, warm candlelight, elegant furniture, pink and gold colors, anime style background, no people' },
  { name: 'training_ground', prompt: 'Medieval castle training grounds, sword practice area, morning light, knights equipment, stone walls, anime style background, no people' }
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
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function generateImage(prompt) {
  const response = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: { size: '1024*1024', n: 1 }
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const taskId = data.output?.task_id;
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
    } else if (status === 'FAILED') return null;
  }
  return null;
}

async function main() {
  console.log('生成公主剧本背景图...\n');
  ensureDirectoryExists(BACKGROUNDS_DIR);
  
  for (let i = 0; i < PRINCESS_BACKGROUNDS.length; i++) {
    const bg = PRINCESS_BACKGROUNDS[i];
    const outputPath = path.join(BACKGROUNDS_DIR, `${bg.name}.png`);
    
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${PRINCESS_BACKGROUNDS.length}] ${bg.name} - 已存在`);
      continue;
    }
    
    console.log(`[${i + 1}/${PRINCESS_BACKGROUNDS.length}] ${bg.name}`);
    const url = await generateImage(bg.prompt);
    
    if (url) {
      await downloadImage(url, outputPath);
      console.log(`  ✓ 已保存`);
    } else {
      console.log(`  ✗ 生成失败`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n完成!');
}

main();
