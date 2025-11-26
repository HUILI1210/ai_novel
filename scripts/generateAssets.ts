/**
 * 资源生成脚本 - 使用阿里云 DashScope API 生成角色立绘和场景背景
 * 运行方式: npx ts-node scripts/generateAssets.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

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
    expression: '平静、日常、温和的表情',
    emotion: 'neutral'
  },
  {
    name: 'wenxi_happy',
    expression: '开心、微笑、眼睛弯弯的愉快表情',
    emotion: 'happy'
  },
  {
    name: 'wenxi_sad',
    expression: '难过、失落、眉头微皱的悲伤表情',
    emotion: 'sad'
  },
  {
    name: 'wenxi_angry',
    expression: '生气、不满、皱眉瞪眼的愤怒表情',
    emotion: 'angry'
  },
  {
    name: 'wenxi_blush',
    expression: '害羞、脸红、不好意思的羞涩表情',
    emotion: 'blush'
  },
  {
    name: 'wenxi_surprised',
    expression: '惊讶、意外、睁大眼睛的吃惊表情',
    emotion: 'surprised'
  }
];

// 场景背景配置
const SCENE_BACKGROUNDS = [
  {
    name: 'school_rooftop',
    prompt: '日本高中学校天台，铁丝网围栏，蓝天白云，远处城市景观，黄昏夕阳氛围',
    timeOfDay: 'sunset'
  },
  {
    name: 'classroom',
    prompt: '日本高中教室内部，整齐的课桌椅，黑板，窗户透进阳光，午后温馨氛围',
    timeOfDay: 'afternoon'
  },
  {
    name: 'school_gate',
    prompt: '日本高中校门口，樱花树，学生来往，春天下午阳光明媚',
    timeOfDay: 'afternoon'
  },
  {
    name: 'school_corridor',
    prompt: '日本高中学校走廊，落地窗，阳光斜照，干净整洁的地板',
    timeOfDay: 'afternoon'
  },
  {
    name: 'library',
    prompt: '日本高中图书馆，整齐的书架，阅读桌，安静温馨的氛围，午后柔和光线',
    timeOfDay: 'afternoon'
  },
  {
    name: 'street_sunset',
    prompt: '日本住宅区街道，电线杆，便利店，黄昏夕阳，温暖的橙色光芒',
    timeOfDay: 'sunset'
  },
  {
    name: 'riverside',
    prompt: '日本河边小路，堤坝，樱花树，傍晚夕阳倒映水面，浪漫氛围',
    timeOfDay: 'sunset'
  },
  {
    name: 'convenience_store',
    prompt: '日本便利店内部，明亮的灯光，货架整齐，夜晚氛围',
    timeOfDay: 'night'
  },
  {
    name: 'park_night',
    prompt: '日本城市公园夜景，路灯照明，长椅，星空，浪漫宁静氛围',
    timeOfDay: 'night'
  },
  {
    name: 'cafe',
    prompt: '日本温馨咖啡店内部，木质装饰，柔和灯光，午后温暖氛围',
    timeOfDay: 'afternoon'
  },
  {
    name: 'train_station',
    prompt: '日本车站月台，等候区，傍晚天空，列车进站，都市氛围',
    timeOfDay: 'evening'
  },
  {
    name: 'bedroom',
    prompt: '日本高中女生房间，床铺整洁，书桌，窗帘透光，温馨私密空间',
    timeOfDay: 'afternoon'
  }
];

// 确保目录存在
function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
}

// 下载图片
async function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        downloadImage(response.headers.location!, outputPath).then(resolve).catch(reject);
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`下载完成: ${outputPath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// 调用 DashScope API 生成图片
async function generateImage(prompt: string, size: string = '1024*1024'): Promise<string | null> {
  try {
    console.log(`开始生成图片...`);
    console.log(`提示词: ${prompt.substring(0, 50)}...`);
    
    // 提交异步任务
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
      console.error(`API 错误: ${submitResponse.status} - ${errorText}`);
      return null;
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.output?.task_id;
    
    if (!taskId) {
      console.error('未获取到任务ID');
      return null;
    }
    
    console.log(`任务已提交，ID: ${taskId}`);

    // 轮询任务状态
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(`${DASHSCOPE_API_BASE}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` }
      });

      if (!statusResponse.ok) {
        console.log(`轮询失败，重试...`);
        continue;
      }

      const statusData = await statusResponse.json();
      const status = statusData.output?.task_status;
      
      console.log(`任务状态: ${status}`);

      if (status === 'SUCCEEDED') {
        const imageUrl = statusData.output?.results?.[0]?.url;
        console.log(`生成成功: ${imageUrl}`);
        return imageUrl;
      } else if (status === 'FAILED') {
        console.error(`生成失败: ${JSON.stringify(statusData)}`);
        return null;
      }
    }
    
    console.error('任务超时');
    return null;
  } catch (e) {
    console.error('生成图片时出错:', e);
    return null;
  }
}

// 生成角色立绘
async function generateCharacterExpressions() {
  console.log('\n========== 开始生成角色表情立绘 ==========\n');
  ensureDirectoryExists(CHARACTERS_DIR);
  
  const baseAppearance = `
    一个美丽的日本高中女生角色立绘，名叫雯曦。
    她有及腰的长直黑发和整齐的刘海，紫色的大眼睛，白皙肌肤。
    穿着深蓝色水手服校服，红色蝴蝶结领结。
    身材苗条，气质温婉。
    正面面对镜头，半身像构图。
    背景必须是纯白色或透明。
    艺术风格：高质量日式动漫，赛璐珞着色，鲜艳色彩，杰作，干净线条，适合游戏素材。
  `;
  
  for (const expr of CHARACTER_EXPRESSIONS) {
    const outputPath = path.join(CHARACTERS_DIR, `${expr.name}.png`);
    
    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
      console.log(`跳过已存在的文件: ${expr.name}`);
      continue;
    }
    
    const prompt = `${baseAppearance}\n面部表情：${expr.expression}。`;
    
    console.log(`\n生成表情: ${expr.name} (${expr.emotion})`);
    const imageUrl = await generateImage(prompt, '768*1152');
    
    if (imageUrl) {
      await downloadImage(imageUrl, outputPath);
    } else {
      console.error(`生成失败: ${expr.name}`);
    }
    
    // 等待一下避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 生成场景背景
async function generateSceneBackgrounds() {
  console.log('\n========== 开始生成场景背景 ==========\n');
  ensureDirectoryExists(BACKGROUNDS_DIR);
  
  const baseStyle = `
    日式视觉小说背景，高质量动漫风格插画。
    无人物，纯场景背景。
    细节丰富，光影效果出色。
    适合作为游戏对话背景使用。
    宽屏横向构图，16:9比例。
  `;
  
  for (const scene of SCENE_BACKGROUNDS) {
    const outputPath = path.join(BACKGROUNDS_DIR, `${scene.name}.png`);
    
    // 检查是否已存在
    if (fs.existsSync(outputPath)) {
      console.log(`跳过已存在的文件: ${scene.name}`);
      continue;
    }
    
    const prompt = `${scene.prompt}\n${baseStyle}`;
    
    console.log(`\n生成场景: ${scene.name}`);
    const imageUrl = await generateImage(prompt, '1024*576');
    
    if (imageUrl) {
      await downloadImage(imageUrl, outputPath);
    } else {
      console.error(`生成失败: ${scene.name}`);
    }
    
    // 等待一下避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 主函数
async function main() {
  console.log('====================================');
  console.log('   AI Novel 资源生成脚本');
  console.log('====================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--characters') || args.length === 0) {
    await generateCharacterExpressions();
  }
  
  if (args.includes('--backgrounds') || args.length === 0) {
    await generateSceneBackgrounds();
  }
  
  console.log('\n====================================');
  console.log('   资源生成完成！');
  console.log('====================================');
}

main().catch(console.error);
