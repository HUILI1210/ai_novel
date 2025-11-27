/**
 * 预定义剧本播放服务
 * 用于加载和播放 stories/XX/script/chapters.json 中的完整剧本
 */

import { CharacterExpression, BackgroundType, BgmMood, SceneData, GameChoice } from '../types';

// 剧本对话节点
export interface ScriptDialogue {
  speaker?: string;
  text: string;
  expression?: string;
  type?: 'cg' | 'narrative';
  cg?: string;
}

// 剧本章节
export interface ScriptChapter {
  id: string;
  title: string;
  background: string;
  bgm: string;
  dialogues: ScriptDialogue[];
  choices?: Array<{
    text: string;
    sentiment: string;
    affectionChange: number;
  }>;
  ending?: {
    type: string;
    title: string;
    description: string;
  };
}

// 完整剧本结构
export interface FullScript {
  id: string;
  title: string;
  chapters: ScriptChapter[];
}

// 剧本播放状态
export interface ScriptPlayState {
  scriptId: string;
  currentChapter: number;
  currentDialogue: number;
  isPlaying: boolean;
  currentCG: string | null;
}

// 表情字符串到枚举的映射
const EXPRESSION_MAP: Record<string, CharacterExpression> = {
  'NEUTRAL': CharacterExpression.NEUTRAL,
  'HAPPY': CharacterExpression.HAPPY,
  'SAD': CharacterExpression.SAD,
  'ANGRY': CharacterExpression.ANGRY,
  'BLUSH': CharacterExpression.BLUSH,
  'SURPRISED': CharacterExpression.SURPRISED,
  'SHY': CharacterExpression.SHY,
  'FEAR': CharacterExpression.FEAR,
};

// 背景字符串到枚举的映射
const BACKGROUND_MAP: Record<string, BackgroundType> = {
  'PALACE_GARDEN': BackgroundType.PALACE_GARDEN,
  'PALACE_HALL': BackgroundType.PALACE_HALL,
  'PALACE_BALCONY': BackgroundType.PALACE_BALCONY,
  'CASTLE_CORRIDOR': BackgroundType.CASTLE_CORRIDOR,
  'ROYAL_BEDROOM': BackgroundType.ROYAL_BEDROOM,
  'TRAINING_GROUND': BackgroundType.TRAINING_GROUND,
  'ABANDONED_GARDEN': BackgroundType.ABANDONED_GARDEN,
  'SCHOOL_ROOFTOP': BackgroundType.SCHOOL_ROOFTOP,
  'CLASSROOM': BackgroundType.CLASSROOM,
  'SCHOOL_GATE': BackgroundType.SCHOOL_GATE,
};

// BGM字符串到枚举的映射
const BGM_MAP: Record<string, BgmMood> = {
  'romantic': BgmMood.ROMANTIC,
  'peaceful': BgmMood.DAILY,
  'melancholy': BgmMood.SAD,
  'dramatic': BgmMood.TENSE,
  'intense': BgmMood.TENSE,
  'mysterious': BgmMood.MYSTERIOUS,
  'happy': BgmMood.HAPPY,
};

// 剧本文件夹映射
const SCRIPT_PATHS: Record<string, string> = {
  'preset_princess': '/stories/02_princess_elena/script/chapters.json',
  'preset_tsundere': '/stories/01_tsundere_wenxi/script/chapters.json',
  'preset_courtesan': '/stories/03_courtesan_liuruyan/script/chapters.json',
};

// 缓存加载的剧本
const scriptCache: Record<string, FullScript> = {};

/**
 * 加载剧本文件
 */
export const loadScript = async (scriptId: string): Promise<FullScript | null> => {
  // 检查缓存
  if (scriptCache[scriptId]) {
    return scriptCache[scriptId];
  }

  const path = SCRIPT_PATHS[scriptId];
  if (!path) {
    console.warn(`未找到剧本: ${scriptId}`);
    return null;
  }

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`加载剧本失败: ${response.status}`);
    }
    const script = await response.json() as FullScript;
    scriptCache[scriptId] = script;
    return script;
  } catch (error) {
    console.error('加载剧本出错:', error);
    return null;
  }
};

/**
 * 检查是否有预定义剧本
 */
export const hasPreloadedScript = (scriptId: string): boolean => {
  return scriptId in SCRIPT_PATHS;
};

/**
 * 将剧本对话转换为游戏场景数据
 */
export const dialogueToSceneData = (
  dialogue: ScriptDialogue,
  chapter: ScriptChapter,
  scriptId: string,
  choices?: GameChoice[]
): SceneData => {
  // 获取CG路径
  let cgPath: string | undefined;
  if (dialogue.type === 'cg' && dialogue.cg) {
    const storyFolder = scriptId === 'preset_princess' ? '02_princess_elena' : 
                        scriptId === 'preset_tsundere' ? '01_tsundere_wenxi' : 
                        '03_courtesan_liuruyan';
    cgPath = `/stories/${storyFolder}/cg/${dialogue.cg}`;
  }

  // 构建基础场景数据
  const sceneData: SceneData = {
    narrative: dialogue.type === 'cg' ? dialogue.text : 
               dialogue.speaker === '旁白' ? dialogue.text : '',
    speaker: dialogue.speaker === '旁白' || dialogue.speaker === '我' || dialogue.type === 'cg' 
             ? (dialogue.speaker || '旁白') : (dialogue.speaker || ''),
    dialogue: dialogue.speaker !== '旁白' && dialogue.type !== 'cg' ? dialogue.text : '',
    expression: EXPRESSION_MAP[dialogue.expression || 'NEUTRAL'] || CharacterExpression.NEUTRAL,
    background: BACKGROUND_MAP[chapter.background] || BackgroundType.PALACE_GARDEN,
    bgm: BGM_MAP[chapter.bgm] || BgmMood.DAILY,
    choices: choices || [],
    affectionChange: 0,
    isGameOver: false,
  };

  // 返回扩展数据（用于CG显示等）
  return {
    ...sceneData,
    cgImage: cgPath,
    isCG: dialogue.type === 'cg',
  } as SceneData & { cgImage?: string; isCG?: boolean };
};

/**
 * 获取章节的所有对话转换为场景数据
 */
export const getChapterScenes = (
  script: FullScript,
  chapterIndex: number,
  scriptId: string
): SceneData[] => {
  const chapter = script.chapters[chapterIndex];
  if (!chapter) return [];

  return chapter.dialogues.map((dialogue, index) => {
    // 只有最后一个对话才显示选择
    const isLastDialogue = index === chapter.dialogues.length - 1;
    const choices: GameChoice[] = isLastDialogue && chapter.choices 
      ? chapter.choices.map(c => ({
          text: c.text,
          sentiment: c.sentiment as 'positive' | 'neutral' | 'negative',
        }))
      : [];

    return dialogueToSceneData(dialogue, chapter, scriptId, choices);
  });
};

/**
 * 获取选择后的好感度变化
 */
export const getChoiceAffection = (
  script: FullScript,
  chapterIndex: number,
  choiceIndex: number
): number => {
  const chapter = script.chapters[chapterIndex];
  if (!chapter?.choices?.[choiceIndex]) return 0;
  return chapter.choices[choiceIndex].affectionChange;
};

/**
 * 检查是否为结局章节
 */
export const isEndingChapter = (script: FullScript, chapterIndex: number): boolean => {
  const chapter = script.chapters[chapterIndex];
  return !!chapter?.ending;
};

/**
 * 获取结局信息
 */
export const getEnding = (script: FullScript, chapterIndex: number) => {
  const chapter = script.chapters[chapterIndex];
  return chapter?.ending || null;
};
