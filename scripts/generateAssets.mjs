/**
 * 资源生成脚本 - 使用阿里云 DashScope API 生成角色立绘和场景背景
 * 运行方式: node scripts/generateAssets.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 阿里云 DashScope API 配置
const DASHSCOPE_API_KEY = 'sk-c6870ab7cb454f45839cfc3529c4c44d';
const DASHSCOPE_API_BASE = 'https://dashscope.aliyuncs.com/api/v1';
const DASHSCOPE_IMAGE_MODEL = 'wanx-v1';

// 输出目录
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CHARACTERS_DIR = path.join(PUBLIC_DIR, 'characters');
const BACKGROUNDS_DIR = path.join(PUBLIC_DIR, 'backgrounds');

// 角色表情配置
const CHARACTER_EXPRESSIONS = [
  {
    name: 'wenxi_neutral',
    expression: '平静、日常、温和的表情，嘴角微微上扬'
  },
  {
    name: 'wenxi_happy',
    expression: '开心、微笑、眼睛弯弯的愉快表情，露出牙齿的笑容'
  },
  {
    name: 'wenxi_sad',
    expression: '难过、失落、眉头微皱的悲伤表情，眼角下垂'
  },
  {
    name: 'wenxi_angry',
    expression: '生气、不满、皱眉瞪眼的愤怒表情，嘟起嘴巴'
  },
  {
    name: 'wenxi_blush',
    expression: '害羞、脸红、不好意思的羞涩表情，脸颊绯红，眼神躲闪'
  },
  {
    name: 'wenxi_surprised',
    expression: '惊讶、意外、睁大眼睛张开嘴巴的吃惊表情'
  }
];

// 场景背景配置
const SCENE_BACKGROUNDS = [
  {
    name: 'school_rooftop',
    prompt: '日本高中学校天台，铁丝网围栏，蓝天白云，远处城市景观，黄昏夕阳氛围，温暖的橙红色光芒'
  },
  {
    name: 'classroom',
    prompt: '日本高中教室内部，整齐的课桌椅，黑板，大窗户透进阳光，午后温馨氛围'
  },
  {
    name: 'school_gate',
    prompt: '日本高中校门口，铁门，校名牌匾，粉色樱花树，春天下午阳光明媚，花瓣飘落'
  },
  {
    name: 'school_corridor',
    prompt: '日本高中学校走廊，落地玻璃窗，阳光斜照投下影子，干净整洁的地板，储物柜'
  },
  {
    name: 'library',
    prompt: '日本高中图书馆，高大的木质书架，阅读长桌，安静温馨的氛围，午后柔和的窗户光线'
  },
  {
    name: 'street_sunset',
    prompt: '日本住宅区街道，电线杆和电线，便利店招牌，黄昏夕阳，温暖的橙色天空'
  },
  {
    name: 'riverside',
    prompt: '日本河边堤坝小路，护栏，粉色樱花树盛开，傍晚夕阳倒映平静水面，浪漫氛围'
  },
  {
    name: 'convenience_store',
    prompt: '日本便利店内部，明亮的白色灯光，整齐的商品货架，收银台，夜晚温馨氛围'
  },
  {
    name: 'park_night',
    prompt: '日本城市公园夜景，暖黄色路灯照明，木质长椅，星空，树影，浪漫宁静氛围'
  },
  {
    name: 'cafe',
    prompt: '日本温馨咖啡店内部，木质桌椅装饰，吊灯，大玻璃窗，午后温暖氛围，精致甜点展示柜'
  },
  {
    name: 'train_station',
    prompt: '日本电车站月台，黄色安全线，列车时刻表，傍晚橙色天空，都市通勤氛围'
  },
  {
    name: 'bedroom',
    prompt: '日本高中女生房间，粉色床铺和窗帘，书桌和台灯，毛绒玩具，窗户透光，温馨私密空间'
  }
];

// 确保目录存在
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
}

// 下载图片
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
        console.log(`✓ 下载完成: ${path.basename(outputPath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// 调用 DashScope API 生成图片
async function generateImage(prompt, size = '1024*1024') {
  try {
    console.log(`  提交生成任务...`);
    
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
        parameters: { size, n: 1 }
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`  ✗ API 错误: ${submitResponse.status} - ${errorText}`);
      return null;
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.output?.task_id;
    
    if (!taskId) {
      console.error('  ✗ 未获取到任务ID');
      return null;
    }
    
    console.log(`  任务ID: ${taskId}`);

    // 轮询任务状态
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(`${DASHSCOPE_API_BASE}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` }
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.output?.task_status;
      
      process.stdout.write(`\r  状态: ${status} (${i + 1}/60)     `);

      if (status === 'SUCCEEDED') {
        console.log('');
        return statusData.output?.results?.[0]?.url;
      } else if (status === 'FAILED') {
        console.log('');
        console.error(`  ✗ 生成失败`);
        return null;
      }
    }
    
    console.log('');
    console.error('  ✗ 任务超时');
    return null;
  } catch (e) {
    console.error('  ✗ 错误:', e.message);
    return null;
  }
}

// 生成角色立绘
async function generateCharacterExpressions() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     开始生成角色表情立绘 (6种)         ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  ensureDirectoryExists(CHARACTERS_DIR);
  
  const baseAppearance = `一个美丽的日本高中女生角色立绘。她有及腰的长直黑发和整齐的刘海，紫色的大眼睛，白皙肌肤。穿着深蓝色水手服校服配红色蝴蝶结领结。身材苗条优雅。正面面对镜头，半身像构图。背景是纯白色。风格：高质量日式动漫，赛璐珞着色，鲜艳色彩，杰作，干净线条。`;
  
  let successCount = 0;
  
  for (let i = 0; i < CHARACTER_EXPRESSIONS.length; i++) {
    const expr = CHARACTER_EXPRESSIONS[i];
    const outputPath = path.join(CHARACTERS_DIR, `${expr.name}.png`);
    
    console.log(`[${i + 1}/${CHARACTER_EXPRESSIONS.length}] 生成: ${expr.name}`);
    
    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
      console.log(`  → 跳过 (文件已存在)`);
      successCount++;
      continue;
    }
    
    const prompt = `${baseAppearance} 面部表情：${expr.expression}。`;
    const imageUrl = await generateImage(prompt, '768*1152');
    
    if (imageUrl) {
      await downloadImage(imageUrl, outputPath);
      successCount++;
    }
    
    // 避免请求过于频繁
    if (i < CHARACTER_EXPRESSIONS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n角色立绘生成完成: ${successCount}/${CHARACTER_EXPRESSIONS.length}`);
}

// 生成场景背景
async function generateSceneBackgrounds() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     开始生成场景背景 (12种)            ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  ensureDirectoryExists(BACKGROUNDS_DIR);
  
  const baseStyle = `日式视觉小说背景，高质量动漫风格插画。无人物，纯场景背景。细节丰富，光影效果出色。宽屏横向构图。`;
  
  let successCount = 0;
  
  for (let i = 0; i < SCENE_BACKGROUNDS.length; i++) {
    const scene = SCENE_BACKGROUNDS[i];
    const outputPath = path.join(BACKGROUNDS_DIR, `${scene.name}.png`);
    
    console.log(`[${i + 1}/${SCENE_BACKGROUNDS.length}] 生成: ${scene.name}`);
    
    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
      console.log(`  → 跳过 (文件已存在)`);
      successCount++;
      continue;
    }
    
    const prompt = `${scene.prompt} ${baseStyle}`;
    const imageUrl = await generateImage(prompt, '1024*1024');
    
    if (imageUrl) {
      await downloadImage(imageUrl, outputPath);
      successCount++;
    }
    
    // 避免请求过于频繁
    if (i < SCENE_BACKGROUNDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n场景背景生成完成: ${successCount}/${SCENE_BACKGROUNDS.length}`);
}

// 主函数
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     AI Novel 资源生成脚本              ║');
  console.log('║     使用阿里云 DashScope API           ║');
  console.log('╚════════════════════════════════════════╝');
  
  const args = process.argv.slice(2);
  const generateAll = args.length === 0;
  
  if (args.includes('--characters') || generateAll) {
    await generateCharacterExpressions();
  }
  
  if (args.includes('--backgrounds') || generateAll) {
    await generateSceneBackgrounds();
  }
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     资源生成完成！                     ║');
  console.log('╚════════════════════════════════════════╝\n');
}

main().catch(console.error);
