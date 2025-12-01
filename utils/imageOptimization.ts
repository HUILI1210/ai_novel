/**
 * 图片优化工具
 * - 支持 WebP 格式检测和回退
 * - 渐进式图片加载
 * - 图片预加载管理
 */

// 检测浏览器是否支持 WebP
let webpSupported: boolean | null = null;

export async function checkWebPSupport(): Promise<boolean> {
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
    // 1x1 WebP 测试图片
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  });
}

// 获取优化后的图片路径
export function getOptimizedImagePath(originalPath: string, useThumbnail = false): string {
  if (!originalPath) return originalPath;
  
  // 如果是外部URL，直接返回
  if (originalPath.startsWith('http://') || originalPath.startsWith('https://')) {
    return originalPath;
  }
  
  // 移除扩展名
  const ext = originalPath.match(/\.(png|jpg|jpeg)$/i)?.[0] || '';
  const basePath = originalPath.replace(/\.(png|jpg|jpeg)$/i, '');
  
  // 如果浏览器支持 WebP 且文件存在 WebP 版本
  if (webpSupported) {
    if (useThumbnail) {
      return `${basePath}_thumb.webp`;
    }
    return `${basePath}.webp`;
  }
  
  return originalPath;
}

// 图片预加载队列
class ImagePreloader {
  private queue: string[] = [];
  private loading = new Set<string>();
  private loaded = new Set<string>();
  private maxConcurrent = 3;
  
  // 添加到预加载队列
  add(urls: string | string[]) {
    const urlList = Array.isArray(urls) ? urls : [urls];
    
    for (const url of urlList) {
      if (!this.loaded.has(url) && !this.loading.has(url) && !this.queue.includes(url)) {
        this.queue.push(url);
      }
    }
    
    this.processQueue();
  }
  
  // 优先加载（插入队列前面）
  prioritize(url: string) {
    if (this.loaded.has(url)) return Promise.resolve();
    
    // 从队列中移除并添加到前面
    this.queue = this.queue.filter(u => u !== url);
    this.queue.unshift(url);
    
    return this.load(url);
  }
  
  // 处理队列
  private processQueue() {
    while (this.loading.size < this.maxConcurrent && this.queue.length > 0) {
      const url = this.queue.shift()!;
      this.load(url);
    }
  }
  
  // 加载单张图片
  private load(url: string): Promise<void> {
    if (this.loading.has(url) || this.loaded.has(url)) {
      return Promise.resolve();
    }
    
    this.loading.add(url);
    
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.loading.delete(url);
        this.loaded.add(url);
        this.processQueue();
        resolve();
      };
      
      img.onerror = () => {
        this.loading.delete(url);
        this.processQueue();
        resolve();
      };
      
      img.src = url;
    });
  }
  
  // 检查是否已加载
  isLoaded(url: string): boolean {
    return this.loaded.has(url);
  }
  
  // 清除缓存
  clear() {
    this.queue = [];
    this.loading.clear();
    this.loaded.clear();
  }
}

export const imagePreloader = new ImagePreloader();

// 预加载关键图片（如当前场景的背景和角色）
export function preloadCriticalImages(urls: string[]) {
  urls.forEach(url => imagePreloader.prioritize(url));
}

// 预加载下一场景可能的图片
export function preloadNextSceneImages(urls: string[]) {
  imagePreloader.add(urls);
}

// 初始化 WebP 支持检测
checkWebPSupport();
