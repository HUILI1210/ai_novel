/**
 * 获取资源文件的正确路径
 * 在开发环境使用 / 开头的路径
 * 在生产环境（GitHub Pages）使用 /ai_novel/ 开头的路径
 * 支持自动 WebP 格式检测和回退
 */

// Vite 会自动注入 BASE_URL
// @ts-ignore - Vite 环境变量
const BASE_URL: string = import.meta.env?.BASE_URL || '/';

// WebP 支持检测（异步，首次调用后缓存）
let webpSupported: boolean | null = null;

async function checkWebPSupport(): Promise<boolean> {
  if (webpSupported !== null) return webpSupported;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      webpSupported = img.width === 1;
      resolve(webpSupported);
    };
    img.onerror = () => {
      webpSupported = false;
      resolve(false);
    };
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
}

// 初始化检测
checkWebPSupport();

/**
 * 将资源路径转换为正确的完整路径
 * @param path 资源路径，如 '/stories/01_tsundere_wenxi/...'
 * @returns 完整路径，如 '/ai_novel/stories/01_tsundere_wenxi/...'
 */
export function getAssetPath(path: string): string {
  // 如果路径已经包含 base，直接返回
  if (path.startsWith(BASE_URL)) {
    return path;
  }
  
  // 移除开头的 /，然后加上 BASE_URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  let fullPath = `${BASE_URL}${cleanPath}`;
  
  // 如果浏览器支持 WebP，且是图片路径，优先使用 WebP
  if (webpSupported && /\.(png|jpg|jpeg)$/i.test(fullPath)) {
    fullPath = fullPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  }
  
  return fullPath;
}

/**
 * 获取带回退的图片路径（用于 <picture> 标签）
 */
export function getImageSrcSet(path: string): { webp: string; original: string } {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const basePath = `${BASE_URL}${cleanPath}`;
  
  return {
    webp: basePath.replace(/\.(png|jpg|jpeg)$/i, '.webp'),
    original: basePath,
  };
}

/**
 * 获取 stories 文件夹下的资源路径
 */
export function getStoryAssetPath(relativePath: string): string {
  return getAssetPath(`/stories/${relativePath}`);
}
