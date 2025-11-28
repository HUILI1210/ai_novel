/**
 * 图片预加载服务
 * 在游戏启动时预加载关键图片资源
 */

import { getAssetPath } from './assetPath';

// 预加载状态
let preloadComplete = false;
const loadedImages = new Set<string>();

// 关键图片列表（首屏需要的图片）
const CRITICAL_IMAGES = [
  // 主菜单女主角
  '/stories/02_princess_elena/expressions/smiling.png',
  // 雯曦表情
  '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
  '/stories/01_tsundere_wenxi/expressions/wenxi_happy.png',
  '/stories/01_tsundere_wenxi/expressions/wenxi_sad.png',
  '/stories/01_tsundere_wenxi/expressions/wenxi_angry.png',
  '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
  '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png',
  // 艾琳娜表情
  '/stories/02_princess_elena/expressions/smiling.png',
  '/stories/02_princess_elena/expressions/sadness.png',
  '/stories/02_princess_elena/expressions/anger.png',
  '/stories/02_princess_elena/expressions/blushing.png',
  '/stories/02_princess_elena/expressions/surprise.png',
];

// 背景图片列表
const BACKGROUND_IMAGES = [
  '/stories/01_tsundere_wenxi/backgrounds/school_rooftop.png',
  '/stories/01_tsundere_wenxi/backgrounds/classroom.png',
  '/stories/01_tsundere_wenxi/backgrounds/school_gate.png',
  '/stories/02_princess_elena/backgrounds/palace_hall.png',
  '/stories/02_princess_elena/backgrounds/palace_garden.png',
];

/**
 * 预加载单张图片
 */
export const preloadImage = (src: string): Promise<void> => {
  const fullPath = getAssetPath(src);
  
  if (loadedImages.has(fullPath)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedImages.add(fullPath);
      resolve();
    };
    img.onerror = () => {
      console.warn(`Failed to preload: ${fullPath}`);
      resolve(); // 即使失败也继续
    };
    img.src = fullPath;
  });
};

/**
 * 批量预加载图片
 */
export const preloadImages = async (sources: string[]): Promise<void> => {
  await Promise.all(sources.map(preloadImage));
};

/**
 * 预加载关键图片（首屏需要的）
 */
export const preloadCriticalImages = async (): Promise<void> => {
  if (preloadComplete) return;
  
  console.log('开始预加载关键图片...');
  const startTime = Date.now();
  
  await preloadImages(CRITICAL_IMAGES);
  
  preloadComplete = true;
  console.log(`关键图片预加载完成，耗时 ${Date.now() - startTime}ms`);
};

/**
 * 后台预加载背景图片（非阻塞）
 */
export const preloadBackgroundImages = (): void => {
  // 使用 requestIdleCallback 在空闲时加载
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadImages(BACKGROUND_IMAGES);
    });
  } else {
    setTimeout(() => {
      preloadImages(BACKGROUND_IMAGES);
    }, 2000);
  }
};

/**
 * 预加载指定角色的所有表情
 */
export const preloadCharacterExpressions = async (characterName: string): Promise<void> => {
  const characterPaths: Record<string, string[]> = {
    '雯曦': [
      '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_happy.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_sad.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_angry.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png',
    ],
    '艾琳娜': [
      '/stories/02_princess_elena/expressions/smiling.png',
      '/stories/02_princess_elena/expressions/sadness.png',
      '/stories/02_princess_elena/expressions/anger.png',
      '/stories/02_princess_elena/expressions/blushing.png',
      '/stories/02_princess_elena/expressions/surprise.png',
    ],
    '柳如烟': [
      '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
    ],
  };

  const paths = characterPaths[characterName];
  if (paths) {
    await preloadImages(paths);
  }
};

/**
 * 预加载指定剧本的资源
 */
export const preloadScriptAssets = async (scriptId: string): Promise<void> => {
  const scriptAssets: Record<string, string[]> = {
    'preset_princess': [
      '/stories/02_princess_elena/expressions/smiling.png',
      '/stories/02_princess_elena/expressions/sadness.png',
      '/stories/02_princess_elena/expressions/anger.png',
      '/stories/02_princess_elena/expressions/blushing.png',
      '/stories/02_princess_elena/expressions/surprise.png',
      '/stories/02_princess_elena/backgrounds/palace_hall.png',
      '/stories/02_princess_elena/backgrounds/palace_garden.png',
      '/stories/02_princess_elena/backgrounds/palace_balcony.png',
    ],
    'preset_tsundere': [
      '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_happy.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_sad.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_angry.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
      '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png',
      '/stories/01_tsundere_wenxi/backgrounds/school_rooftop.png',
      '/stories/01_tsundere_wenxi/backgrounds/classroom.png',
    ],
  };

  const assets = scriptAssets[scriptId];
  if (assets) {
    await preloadImages(assets);
  }
};

/**
 * 检查图片是否已加载
 */
export const isImageLoaded = (src: string): boolean => {
  return loadedImages.has(getAssetPath(src));
};
