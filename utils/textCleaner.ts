/**
 * 统一的文本清理工具
 * 用于修复 AI 生成文本中的常见错误
 */

// 允许重复的字符（不需要修复）
const VALID_REDUPLICATED_CHARS = [
  // 标点符号
  '。', '！', '？', '…', '.', '!', '?', '～', '~',
  // 语气词
  '哈', '呵', '嘿', '嗯', '啊', '呀', '哦', '噢', '呜', '咦',
  // 叠词常用字
  '静', '慢', '悄', '偷', '轻', '默', '渐', '好', '刚', '仅', '常', '往',
  // 时间单位
  '天', '年', '月', '日', '时', '分', '秒',
  // 数字
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万'
];

// 预处理修复规则（在重复字修复之前应用）
const PRE_FIX_PATTERNS: [RegExp, string][] = [
  [/樱飞飞/g, '樱花飞'],
  [/樱飞散/g, '樱花飞散'],
  [/放后/g, '放学后'],
  [/回到到校/g, '回到学校'],
  [/到到校/g, '到学校'],
  [/谁你担心/g, '谁要你担心'],
];

// 后处理修复规则（在重复字修复之后应用）
const POST_FIX_PATTERNS: [RegExp, string][] = [
  [/樱飞散的/g, '樱花飞散的'],
  [/樱花散的/g, '樱花飞散的'],
  [/樱花飞的/g, '樱花飞舞的'],
  [/樱飞散/g, '樱花飞散'],
  [/樱飞的/g, '樱花飞舞的'],
  [/樱飞舞/g, '樱花飞舞'],
  [/樱飞飞/g, '樱花飞'],
  [/天台风(?!景)/g, '天台吹风'],
  [/天台台风/g, '天台吹风'],
  [/在台吹风/g, '在天台吹风'],
  [/在台乘凉/g, '在天台乘凉'],
  [/只好回学校/g, '只好回到学校'],
  [/只好到学校/g, '只好回到学校'],
  [/好到学校/g, '好回到学校'],
  [/回学校/g, '回到学校'],
  [/回到校/g, '回到学校'],
  [/回到学取/g, '回到学校取'],
  [/到校取/g, '到学校取'],
];

/**
 * 清理 AI 生成的文本，修复常见错误
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // 第一步：修复特定的漏字问题（在重复字清理之前）
  for (const [pattern, replacement] of PRE_FIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // 第二步：修复连续重复的汉字（保留合法的重复）
  cleaned = cleaned.replace(/(.)\1{1,}/g, (match, char) => {
    if (VALID_REDUPLICATED_CHARS.includes(char)) {
      // 合法重复，但限制最大长度为 3
      return match.length > 3 ? char.repeat(3) : match;
    }
    // 非法重复，只保留一个
    return char;
  });
  
  // 第三步：修复重复字清理后的残留问题
  for (const [pattern, replacement] of POST_FIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // 第四步：修复括号不匹配
  if (cleaned.includes('）') && !cleaned.includes('（')) {
    cleaned = '（' + cleaned;
  }
  
  return cleaned.trim();
}

/**
 * 用于兼容旧代码的别名
 */
export const cleanAIText = cleanText;
export const cleanDialogueText = cleanText;
