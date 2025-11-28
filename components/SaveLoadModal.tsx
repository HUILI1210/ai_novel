import React, { useState, useEffect, useCallback } from 'react';
import { 
  SaveData, 
  SaveSlot, 
  getScriptSaves, 
  saveGame, 
  loadGame, 
  deleteSave,
  formatSaveTime,
  getSaveIndex,
  ScriptSaveInfo
} from '../services/saveService';
import { CharacterExpression, BackgroundType, BgmMood } from '../types';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'load';
  scriptId?: string;           // 当 showAllScripts=true 时可选
  scriptTitle?: string;        // 当 showAllScripts=true 时可选
  showAllScripts?: boolean;    // 显示所有剧本的存档（用于主菜单）
  // 当前游戏状态（用于保存）
  currentState?: {
    chapterIndex: number;
    dialogueIndex: number;
    affection: number;
    turnsPlayed: number;
    characterName: string;
    currentExpression: CharacterExpression;
    currentBackground: BackgroundType;
    currentBgm: BgmMood;
    currentDialogue: string;
  };
  // 加载回调
  onLoad?: (saveData: SaveData) => void;
}

// 所有剧本存档的数据结构
interface AllScriptsSaveData {
  scriptId: string;
  scriptTitle: string;
  slot: SaveSlot;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  isOpen,
  onClose,
  mode,
  scriptId,
  scriptTitle,
  showAllScripts = false,
  currentState,
  onLoad,
}) => {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [allSaves, setAllSaves] = useState<AllScriptsSaveData[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // 改为 string 以支持多剧本

  // 加载存档槽位
  const loadSlots = useCallback(() => {
    if (showAllScripts) {
      // 加载所有剧本的存档
      const saveIndex = getSaveIndex();
      const saves: AllScriptsSaveData[] = [];
      
      Object.entries(saveIndex).forEach(([sid, scriptInfo]) => {
        scriptInfo.slots.forEach(slot => {
          if (slot.saveData) {
            saves.push({
              scriptId: sid,
              scriptTitle: slot.saveData.scriptTitle,
              slot,
            });
          }
        });
      });
      
      // 按时间排序，最新的在前
      saves.sort((a, b) => 
        (b.slot.saveData?.timestamp || 0) - (a.slot.saveData?.timestamp || 0)
      );
      
      setAllSaves(saves);
    } else if (scriptId) {
      // 加载单个剧本的存档
      const scriptSaves = getScriptSaves(scriptId);
      setSlots(scriptSaves.slots);
    }
  }, [scriptId, showAllScripts]);

  useEffect(() => {
    if (isOpen) {
      loadSlots();
      setConfirmDelete(null);
    }
  }, [isOpen, loadSlots]);

  // 保存游戏（仅单剧本模式）
  const handleSave = (slotIndex: number) => {
    if (!currentState || !scriptId || !scriptTitle) return;

    saveGame(scriptId, slotIndex, {
      scriptId,
      scriptTitle,
      chapterIndex: currentState.chapterIndex,
      dialogueIndex: currentState.dialogueIndex,
      affection: currentState.affection,
      turnsPlayed: currentState.turnsPlayed,
      characterName: currentState.characterName,
      currentExpression: currentState.currentExpression,
      currentBackground: currentState.currentBackground,
      currentBgm: currentState.currentBgm,
      previewText: currentState.currentDialogue.substring(0, 50) + 
                   (currentState.currentDialogue.length > 50 ? '...' : ''),
    });

    loadSlots();
  };

  // 加载游戏（单剧本模式）
  const handleLoad = (slotIndex: number) => {
    if (!scriptId) return;
    const saveData = loadGame(scriptId, slotIndex);
    if (saveData && onLoad) {
      onLoad(saveData);
      onClose();
    }
  };

  // 加载游戏（所有剧本模式）
  const handleLoadAll = (sid: string, slotIndex: number) => {
    const saveData = loadGame(sid, slotIndex);
    if (saveData && onLoad) {
      onLoad(saveData);
      onClose();
    }
  };

  // 删除存档（单剧本模式）
  const handleDelete = (slotIndex: number) => {
    const key = `${scriptId}_${slotIndex}`;
    if (confirmDelete === key) {
      if (scriptId) {
        deleteSave(scriptId, slotIndex);
        loadSlots();
      }
      setConfirmDelete(null);
    } else {
      setConfirmDelete(key);
    }
  };

  // 删除存档（所有剧本模式）
  const handleDeleteAll = (sid: string, slotIndex: number) => {
    const key = `${sid}_${slotIndex}`;
    if (confirmDelete === key) {
      deleteSave(sid, slotIndex);
      loadSlots();
      setConfirmDelete(null);
    } else {
      setConfirmDelete(key);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 
                      rounded-2xl border border-purple-500/30 shadow-2xl 
                      w-[90%] max-w-2xl max-h-[80vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {mode === 'save' ? '💾 保存游戏' : '📂 读取存档'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 剧本标题（仅单剧本模式显示） */}
        {!showAllScripts && scriptTitle && (
          <div className="px-4 py-2 bg-purple-900/30 border-b border-purple-500/20">
            <p className="text-purple-300 text-sm">
              📚 {scriptTitle}
            </p>
          </div>
        )}

        {/* 存档列表 */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
          {/* 所有剧本模式 */}
          {showAllScripts ? (
            allSaves.length > 0 ? (
              allSaves.map((item) => {
                const key = `${item.scriptId}_${item.slot.slotIndex}`;
                return (
                  <div
                    key={key}
                    className="relative p-4 rounded-xl border transition-all duration-300
                      bg-slate-800/80 border-purple-500/40 hover:border-purple-400/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {/* 剧本名称 */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-cyan-400 font-bold text-sm px-2 py-0.5 bg-cyan-900/50 rounded">
                            {item.scriptTitle}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatSaveTime(item.slot.saveData!.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-gray-300">
                            📖 第 {item.slot.saveData!.chapterIndex + 1} 章 · 
                            回合 {item.slot.saveData!.turnsPlayed}
                          </p>
                          <p className="text-pink-400">
                            ♥ 好感度: {item.slot.saveData!.affection}
                          </p>
                          <p className="text-gray-500 text-xs truncate max-w-md">
                            "{item.slot.saveData!.previewText}"
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadAll(item.scriptId, item.slot.slotIndex)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 
                                     text-white rounded-lg transition-colors text-sm"
                        >
                          读取
                        </button>
                        <button
                          onClick={() => handleDeleteAll(item.scriptId, item.slot.slotIndex)}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm
                            ${confirmDelete === key
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-700 hover:bg-red-600/50 text-gray-400 hover:text-white'
                            }`}
                        >
                          {confirmDelete === key ? '确认?' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无存档
              </div>
            )
          ) : (
            /* 单剧本模式 */
            slots.map((slot) => {
              const key = `${scriptId}_${slot.slotIndex}`;
              return (
                <div
                  key={slot.slotIndex}
                  className={`relative p-4 rounded-xl border transition-all duration-300
                    ${slot.saveData 
                      ? 'bg-slate-800/80 border-purple-500/40 hover:border-purple-400/60' 
                      : 'bg-slate-800/40 border-slate-600/30 hover:border-slate-500/50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-400 font-bold">
                          存档 {slot.slotIndex + 1}
                        </span>
                        {slot.saveData && (
                          <span className="text-xs text-gray-500">
                            {formatSaveTime(slot.saveData.timestamp)}
                          </span>
                        )}
                      </div>

                      {slot.saveData ? (
                        <div className="text-sm space-y-1">
                          <p className="text-gray-300">
                            📖 第 {slot.saveData.chapterIndex + 1} 章 · 
                            回合 {slot.saveData.turnsPlayed}
                          </p>
                          <p className="text-pink-400">
                            ♥ 好感度: {slot.saveData.affection}
                          </p>
                          <p className="text-gray-500 text-xs truncate max-w-md">
                            "{slot.saveData.previewText}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          空存档槽位
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {mode === 'save' ? (
                        <button
                          onClick={() => handleSave(slot.slotIndex)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 
                                     text-white rounded-lg transition-colors text-sm"
                        >
                          {slot.saveData ? '覆盖' : '保存'}
                        </button>
                      ) : (
                        slot.saveData && (
                          <button
                            onClick={() => handleLoad(slot.slotIndex)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 
                                       text-white rounded-lg transition-colors text-sm"
                          >
                            读取
                          </button>
                        )
                      )}

                      {slot.saveData && (
                        <button
                          onClick={() => handleDelete(slot.slotIndex)}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm
                            ${confirmDelete === key
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-700 hover:bg-red-600/50 text-gray-400 hover:text-white'
                            }`}
                        >
                          {confirmDelete === key ? '确认?' : '🗑️'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-4 border-t border-purple-500/20 bg-slate-900/50">
          <p className="text-gray-500 text-xs text-center">
            {mode === 'save' 
              ? '选择一个槽位保存当前进度' 
              : '选择一个存档继续游戏'}
          </p>
        </div>
      </div>
    </div>
  );
};
