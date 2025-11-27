/**
 * 存档服务 - 管理游戏存档的保存和加载
 */

import { CharacterExpression, BackgroundType, BgmMood } from '../types';

// 存档数据结构
export interface SaveData {
  id: string;                    // 存档ID (scriptId_slotIndex)
  scriptId: string;              // 剧本ID
  scriptTitle: string;           // 剧本标题
  chapterIndex: number;          // 章节索引
  dialogueIndex: number;         // 对话索引
  affection: number;             // 好感度
  turnsPlayed: number;           // 已玩回合数
  characterName: string;         // 角色名称
  currentExpression: CharacterExpression;  // 当前表情
  currentBackground: BackgroundType;       // 当前背景
  currentBgm: BgmMood;           // 当前BGM
  timestamp: number;             // 保存时间戳
  previewText: string;           // 预览文本（当前对话）
  thumbnailBg?: string;          // 缩略图背景
}

// 存档槽位
export interface SaveSlot {
  slotIndex: number;             // 槽位索引 (0, 1, 2)
  saveData: SaveData | null;     // 存档数据，null表示空槽位
}

// 每个剧本的存档信息
export interface ScriptSaveInfo {
  scriptId: string;
  slots: SaveSlot[];
  lastPlayedSlot?: number;       // 最后游玩的槽位
}

const SAVE_KEY_PREFIX = 'ai_novel_save_';
const SAVE_INDEX_KEY = 'ai_novel_save_index';
const MAX_SLOTS = 3;

/**
 * 获取存档索引（所有剧本的存档摘要）
 */
export const getSaveIndex = (): Record<string, ScriptSaveInfo> => {
  try {
    const data = localStorage.getItem(SAVE_INDEX_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

/**
 * 保存存档索引
 */
const saveSaveIndex = (index: Record<string, ScriptSaveInfo>): void => {
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
};

/**
 * 获取指定剧本的存档信息
 */
export const getScriptSaves = (scriptId: string): ScriptSaveInfo => {
  const index = getSaveIndex();
  if (index[scriptId]) {
    return index[scriptId];
  }
  // 初始化空存档槽位
  return {
    scriptId,
    slots: Array.from({ length: MAX_SLOTS }, (_, i) => ({
      slotIndex: i,
      saveData: null,
    })),
  };
};

/**
 * 保存游戏到指定槽位
 */
export const saveGame = (
  scriptId: string,
  slotIndex: number,
  saveData: Omit<SaveData, 'id' | 'timestamp'>
): SaveData => {
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
    throw new Error(`Invalid slot index: ${slotIndex}`);
  }

  const fullSaveData: SaveData = {
    ...saveData,
    id: `${scriptId}_${slotIndex}`,
    timestamp: Date.now(),
  };

  // 保存完整存档数据
  const saveKey = `${SAVE_KEY_PREFIX}${scriptId}_${slotIndex}`;
  localStorage.setItem(saveKey, JSON.stringify(fullSaveData));

  // 更新存档索引
  const index = getSaveIndex();
  if (!index[scriptId]) {
    index[scriptId] = {
      scriptId,
      slots: Array.from({ length: MAX_SLOTS }, (_, i) => ({
        slotIndex: i,
        saveData: null,
      })),
    };
  }
  index[scriptId].slots[slotIndex] = {
    slotIndex,
    saveData: fullSaveData,
  };
  index[scriptId].lastPlayedSlot = slotIndex;
  saveSaveIndex(index);

  return fullSaveData;
};

/**
 * 加载指定槽位的存档
 */
export const loadGame = (scriptId: string, slotIndex: number): SaveData | null => {
  try {
    const saveKey = `${SAVE_KEY_PREFIX}${scriptId}_${slotIndex}`;
    const data = localStorage.getItem(saveKey);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * 删除指定槽位的存档
 */
export const deleteSave = (scriptId: string, slotIndex: number): void => {
  const saveKey = `${SAVE_KEY_PREFIX}${scriptId}_${slotIndex}`;
  localStorage.removeItem(saveKey);

  // 更新存档索引
  const index = getSaveIndex();
  if (index[scriptId]?.slots[slotIndex]) {
    index[scriptId].slots[slotIndex].saveData = null;
    saveSaveIndex(index);
  }
};

/**
 * 检查是否有任何存档
 */
export const hasAnySave = (): boolean => {
  const index = getSaveIndex();
  return Object.values(index).some(scriptInfo =>
    scriptInfo.slots.some(slot => slot.saveData !== null)
  );
};

/**
 * 获取最近的存档（用于"继续游戏"）
 */
export const getLatestSave = (): SaveData | null => {
  const index = getSaveIndex();
  let latestSave: SaveData | null = null;
  let latestTimestamp = 0;

  Object.values(index).forEach(scriptInfo => {
    scriptInfo.slots.forEach(slot => {
      if (slot.saveData && slot.saveData.timestamp > latestTimestamp) {
        latestTimestamp = slot.saveData.timestamp;
        latestSave = slot.saveData;
      }
    });
  });

  return latestSave;
};

/**
 * 格式化存档时间
 */
export const formatSaveTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

/**
 * 获取所有有存档的剧本列表
 */
export const getSavedScripts = (): string[] => {
  const index = getSaveIndex();
  return Object.keys(index).filter(scriptId =>
    index[scriptId].slots.some(slot => slot.saveData !== null)
  );
};
