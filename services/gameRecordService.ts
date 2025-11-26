/**
 * 通关记录服务 - 管理游戏通关记录
 */

export interface GameRecord {
  id: string;
  scriptId: string;
  scriptName: string;
  characterName: string;
  endingType: 'good' | 'normal' | 'bad';
  finalAffection: number;
  turnsPlayed: number;
  completedAt: number;
}

const STORAGE_KEY = 'gala_game_records';

// 获取所有通关记录
export const getAllRecords = (): GameRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as GameRecord[];
    }
  } catch (e) {
    console.error('Failed to load game records:', e);
  }
  return [];
};

// 获取指定剧本的通关记录
export const getRecordsByScriptId = (scriptId: string): GameRecord[] => {
  return getAllRecords().filter(r => r.scriptId === scriptId);
};

// 检查剧本是否已通关
export const hasCompletedScript = (scriptId: string): boolean => {
  return getRecordsByScriptId(scriptId).length > 0;
};

// 获取剧本的最佳结局
export const getBestEnding = (scriptId: string): GameRecord | null => {
  const records = getRecordsByScriptId(scriptId);
  if (records.length === 0) return null;
  
  // 按结局类型和好感度排序
  const sorted = records.sort((a, b) => {
    const endingOrder = { good: 3, normal: 2, bad: 1 };
    const endingDiff = endingOrder[b.endingType] - endingOrder[a.endingType];
    if (endingDiff !== 0) return endingDiff;
    return b.finalAffection - a.finalAffection;
  });
  
  return sorted[0];
};

// 保存通关记录
export const saveRecord = (record: Omit<GameRecord, 'id' | 'completedAt'>): GameRecord => {
  const newRecord: GameRecord = {
    ...record,
    id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    completedAt: Date.now()
  };
  
  const records = getAllRecords();
  records.push(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  return newRecord;
};

// 删除通关记录
export const deleteRecord = (id: string): boolean => {
  const records = getAllRecords();
  const filtered = records.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

// 清除所有通关记录
export const clearAllRecords = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// 根据好感度判断结局类型
export const determineEndingType = (affection: number): 'good' | 'normal' | 'bad' => {
  if (affection >= 70) return 'good';
  if (affection >= 40) return 'normal';
  return 'bad';
};

// 获取结局描述
export const getEndingDescription = (endingType: 'good' | 'normal' | 'bad'): string => {
  switch (endingType) {
    case 'good':
      return '🌸 完美结局';
    case 'normal':
      return '🌙 普通结局';
    case 'bad':
      return '💔 遗憾结局';
  }
};

// 统计数据
export const getStats = () => {
  const records = getAllRecords();
  return {
    totalCompletions: records.length,
    goodEndings: records.filter(r => r.endingType === 'good').length,
    normalEndings: records.filter(r => r.endingType === 'normal').length,
    badEndings: records.filter(r => r.endingType === 'bad').length,
    uniqueScripts: new Set(records.map(r => r.scriptId)).size
  };
};
