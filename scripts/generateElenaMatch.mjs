/**
 * 生成匹配用户参考图的艾琳娜立绘
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

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'characters', 'elena_base.png');

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
  const submitResponse = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: { size: '768*1152', n: 1 }
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
    process.stdout.write(`\r状态: ${status} (${i + 1}/60)   `);
    if (status === 'SUCCEEDED') {
      console.log('');
      return statusData.output?.results?.[0]?.url;
    } else if (status === 'FAILED') {
      return null;
    }
  }
  return null;
}

async function main() {
  console.log('生成艾琳娜公主立绘（匹配参考图风格）...\n');
  
  // 精确描述用户提供的参考图特征
  const prompt = `一位欧洲皇室公主的动漫角色立绘。

外貌特征（必须精确匹配）：
- 金色波浪长发，发丝柔顺飘逸，长度及腰
- 宝石蓝色大眼睛，清澈明亮
- 白皙细腻的肌肤
- 优雅高贵的气质，微微含笑

服装特征（必须精确匹配）：
- 华丽的白色欧式宫廷礼服
- 礼服上有精致的金色花纹刺绣和装饰
- 蕾丝花边点缀
- 珍珠项链装饰

构图要求：
- 正面半身像，展示上半身和部分裙摆
- 背景为简洁的淡色或透明
- 高质量日式动漫风格
- 精致细腻的画风，色彩柔和优雅

风格：masterpiece, best quality, anime style, detailed, elegant princess`;

  const url = await generateImage(prompt);
  
  if (url) {
    await downloadImage(url, OUTPUT_PATH);
    console.log(`✓ 已保存到: ${OUTPUT_PATH}`);
  } else {
    console.log('✗ 生成失败');
  }
}

main();
