/**
 * 获取资源文件的正确路径
 * 在开发环境使用 / 开头的路径
 * 在生产环境（GitHub Pages）使用 /ai_novel/ 开头的路径
 */

// Vite 会自动注入 BASE_URL
// @ts-ignore - Vite 环境变量
const BASE_URL: string = import.meta.env?.BASE_URL || '/';

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
  return `${BASE_URL}${cleanPath}`;
}

/**
 * 获取 stories 文件夹下的资源路径
 */
export function getStoryAssetPath(relativePath: string): string {
  return getAssetPath(`/stories/${relativePath}`);
}
