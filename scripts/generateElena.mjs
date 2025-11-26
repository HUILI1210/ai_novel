/**
 * 艾琳娜公主表情生成脚本
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

const CHARACTERS_DIR = path.join(__dirname, '..', 'public', 'characters');

// 艾琳娜表情配置
const ELENA_EXPRESSIONS = [
  { name: 'elena_neutral', expression: '优雅自信、微微扬起下巴的高贵表情' },
  { name: 'elena_happy', expression: '温柔微笑、眼中带着喜悦的幸福表情' },
  { name: 'elena_sad', expression: '眉头微蹙、眼中含着忧愁的悲伤表情' },
  { name: 'elena_angry', expression: '眉头紧锁、眼神凌厉的愤怒表情' },
  { name: 'elena_blush', expression: '脸颊绯红、眼神躲闪的害羞表情' },
  { name: 'elena_surprised', expression: '睁大眼睛、微微张嘴的惊讶表情' }
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
  console.log('生成艾琳娜公主表情立绘...\n');
  ensureDirectoryExists(CHARACTERS_DIR);
  
  // 艾琳娜的外观描述 - 基于用户提供的图片
  const baseAppearance = `一个美丽高贵的欧洲公主角色立绘。她有金色波浪长发，宝石蓝色的大眼睛，白皙肌肤。穿着华丽的白色宫廷礼服，礼服上有精致的金色花纹刺绣和蕾丝装饰。身材优雅修长，气质高贵冷艳。正面面对镜头，半身像构图。背景是纯白色。风格：高质量欧式奇幻动漫，精致细腻，杰作，干净线条。`;
  
  for (let i = 0; i < ELENA_EXPRESSIONS.length; i++) {
    const expr = ELENA_EXPRESSIONS[i];
    const outputPath = path.join(CHARACTERS_DIR, `${expr.name}.png`);
    
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${ELENA_EXPRESSIONS.length}] ${expr.name} - 已存在`);
      continue;
    }
    
    console.log(`[${i + 1}/${ELENA_EXPRESSIONS.length}] ${expr.name}`);
    const prompt = `${baseAppearance} 面部表情：${expr.expression}。`;
    const url = await generateImage(prompt);
    
    if (url) {
      await downloadImage(url, outputPath);
    } else {
      console.log(`  ✗ 生成失败`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n完成!');
}

main();
