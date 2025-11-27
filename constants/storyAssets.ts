/**
 * 剧本资源路径配置
 * 所有素材按剧本分类存放在 public/stories/ 目录下
 */

// 剧本ID到文件夹名的映射
export const STORY_FOLDERS: Record<string, string> = {
  'preset_tsundere': '01_tsundere_wenxi',
  'preset_princess': '02_princess_elena',
  'preset_courtesan': '03_courtesan_liuruyan',
  'default': '01_tsundere_wenxi'
};

// 获取剧本的资源基础路径
export const getStoryBasePath = (scriptId: string): string => {
  const folder = STORY_FOLDERS[scriptId] || STORY_FOLDERS['default'];
  return `/stories/${folder}`;
};

// 获取角色表情图片路径
export const getExpressionPath = (scriptId: string, filename: string): string => {
  return `${getStoryBasePath(scriptId)}/expressions/${filename}`;
};

// 获取背景图片路径
export const getBackgroundPath = (scriptId: string, filename: string): string => {
  return `${getStoryBasePath(scriptId)}/backgrounds/${filename}`;
};

// 获取CG图片路径
export const getCGPath = (scriptId: string, filename: string): string => {
  return `${getStoryBasePath(scriptId)}/cg/${filename}`;
};

// 获取参考图路径
export const getReferencePath = (scriptId: string, filename: string): string => {
  return `${getStoryBasePath(scriptId)}/reference/${filename}`;
};

// 角色名到剧本ID的映射
export const CHARACTER_TO_SCRIPT: Record<string, string> = {
  '雯曦': 'preset_tsundere',
  '艾琳娜': 'preset_princess',
  '柳如烟': 'preset_courtesan'
};

// 根据角色名获取剧本ID
export const getScriptIdByCharacter = (characterName: string): string => {
  return CHARACTER_TO_SCRIPT[characterName] || 'preset_tsundere';
};
