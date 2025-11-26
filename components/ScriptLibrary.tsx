import React, { useState, memo, useEffect, useCallback } from 'react';
import { ScriptTemplate } from '../types';
import { getAllScripts, deleteScript, isPresetScript } from '../services/scriptLibraryService';
import { getBestEnding, getEndingDescription } from '../services/gameRecordService';
import { DialogueCacheService } from '../services/dialogueCacheService';
import { ScriptEditor } from './ScriptEditor';

// 角色预览图映射
const CHARACTER_PREVIEW_IMAGES: Record<string, string> = {
  '雯曦': '/characters/wenxi_neutral.png',
  '艾琳娜': '/characters/elena_base.png',
  '柳如烟': '/characters/wenxi_neutral.png', // TODO: 生成柳如烟的立绘
};

const getCharacterPreviewImage = (characterName: string): string => {
  return CHARACTER_PREVIEW_IMAGES[characterName] || '/characters/wenxi_neutral.png';
};

interface ScriptLibraryProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectScript: (script: ScriptTemplate) => void;
  onCreateNew: () => void;
}

interface PreloadStatus {
  scriptId: string;
  status: string;
  progress: number;
  isLoading: boolean;
}

export const ScriptLibrary: React.FC<ScriptLibraryProps> = memo(({
  isVisible,
  onClose,
  onSelectScript,
  onCreateNew
}) => {
  const [scripts, setScripts] = useState<ScriptTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingScript, setEditingScript] = useState<ScriptTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus | null>(null);
  const [cachedScripts, setCachedScripts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isVisible) {
      setScripts(getAllScripts());
      // 检查哪些剧本已缓存
      const cacheService = DialogueCacheService.getInstance();
      const cached = new Set<string>();
      getAllScripts().forEach(script => {
        if (cacheService.isScriptFullyCached(script.id)) {
          cached.add(script.id);
        }
      });
      setCachedScripts(cached);
    }
  }, [isVisible]);

  const handlePreload = useCallback(async (script: ScriptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (preloadStatus?.isLoading) {
      alert('已有预加载任务进行中，请等待完成');
      return;
    }

    const cacheService = DialogueCacheService.getInstance();
    
    if (cacheService.isScriptFullyCached(script.id)) {
      alert('该剧本已完全缓存！');
      return;
    }

    setPreloadStatus({
      scriptId: script.id,
      status: '准备预加载...',
      progress: 0,
      isLoading: true
    });

    const success = await cacheService.preloadScript(script, (status, progress) => {
      setPreloadStatus(prev => prev ? {
        ...prev,
        status,
        progress
      } : null);
    });

    if (success) {
      setCachedScripts(prev => new Set([...prev, script.id]));
    }

    setTimeout(() => {
      setPreloadStatus(null);
    }, 2000);
  }, [preloadStatus]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPresetScript(id)) {
      alert('预设剧本不能删除哦~');
      return;
    }
    if (confirm('确定要删除这个剧本吗？删除后无法恢复。')) {
      deleteScript(id);
      setScripts(getAllScripts());
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  const handleSelect = (script: ScriptTemplate) => {
    setSelectedId(script.id);
  };

  const handleConfirm = () => {
    const script = scripts.find(s => s.id === selectedId);
    if (script) {
      onSelectScript(script);
    }
  };

  const handleEdit = (script: ScriptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingScript(script);
    setShowEditor(true);
  };

  const handleEditorSave = (updatedScript: ScriptTemplate) => {
    setScripts(getAllScripts());
    setShowEditor(false);
    setEditingScript(null);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingScript(null);
  };

  const toggleExpandScript = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedScripts);
    if (newExpanded.has(scriptId)) {
      newExpanded.delete(scriptId);
    } else {
      newExpanded.add(scriptId);
    }
    setExpandedScripts(newExpanded);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            📚 剧本库
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Script List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {scripts.map((script) => (
            <div
              key={script.id}
              onClick={() => handleSelect(script)}
              className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                selectedId === script.id
                  ? 'bg-amber-600/20 border-amber-500'
                  : 'bg-slate-700/50 border-transparent hover:bg-slate-700'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 角色形象预览 */}
                <div className="flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden bg-gradient-to-b from-pink-500/20 to-purple-500/20 border border-slate-600">
                  <img 
                    src={getCharacterPreviewImage(script.character.name)} 
                    alt={script.character.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-100">
                          {script.name}
                        </h3>
                    {isPresetScript(script.id) && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-pink-600 to-purple-600 text-xs rounded-full text-white">
                        预设
                      </span>
                    )}
                    {(() => {
                      const best = getBestEnding(script.id);
                      if (best) {
                        return (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            best.endingType === 'good' ? 'bg-green-600' :
                            best.endingType === 'normal' ? 'bg-yellow-600' : 'bg-red-600'
                          } text-white`}>
                            {getEndingDescription(best.endingType)}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {script.description && (
                    <p className="text-sm text-slate-400 mt-1">{script.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>👤 {script.character.name}</span>
                    <span>🏠 {script.setting}</span>
                  </div>
                </div>
                
                <div className="flex gap-1 items-center">
                      {/* 预加载按钮 */}
                      {cachedScripts.has(script.id) ? (
                        <span className="px-2 py-1 text-xs bg-green-600/30 text-green-400 rounded-full">
                          ✓ 已缓存
                        </span>
                      ) : preloadStatus?.scriptId === script.id ? (
                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-600/30 rounded-full">
                          <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 transition-all duration-300"
                              style={{ width: `${preloadStatus.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-blue-400">{Math.round(preloadStatus.progress)}%</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handlePreload(script, e)}
                          className="px-2 py-1 text-xs bg-blue-600/30 text-blue-400 rounded-full hover:bg-blue-600/50 transition-colors"
                          title="预加载此剧本"
                        >
                          ⬇️ 预加载
                        </button>
                      )}
                      <button
                        onClick={(e) => handleEdit(script, e)}
                        className="p-2 text-slate-500 hover:text-amber-400 transition-colors"
                        title="编辑剧本"
                      >
                        ✏️
                      </button>
                      {!isPresetScript(script.id) && (
                        <button
                          onClick={(e) => handleDelete(script.id, e)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                          title="删除剧本"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Plot Preview */}
              {script.plotFramework && (
                <div className="mt-3">
                  <div className={`p-3 bg-slate-900/50 rounded-lg text-sm text-slate-400 transition-all duration-300 ease-in-out ${
                    expandedScripts.has(script.id) ? '' : 'line-clamp-3'
                  }`}>
                    {script.plotFramework}
                  </div>
                  {script.plotFramework.length > 200 && (
                    <button
                      onClick={(e) => toggleExpandScript(script.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpandScript(script.id, e as any);
                        }
                      }}
                      className="mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded px-2 py-1"
                      aria-label={expandedScripts.has(script.id) ? '收起剧情框架' : '展开剧情框架'}
                      aria-expanded={expandedScripts.has(script.id)}
                    >
                      {expandedScripts.has(script.id) ? '收起 ▲' : '展开更多 ▼'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onCreateNew}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            ✨ 创建新剧本
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ▶️ 使用此剧本开始
          </button>
        </div>
      </div>
    
    {/* Script Editor Modal */}
    {showEditor && editingScript && (
      <ScriptEditor
        initialScript={editingScript}
        isEditing={true}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
        onGeneratePlot={async (prompt: string) => {
          // 这里可以集成剧情生成功能
          return prompt;
        }}
      />
    )}
  </div>
  );
});

ScriptLibrary.displayName = 'ScriptLibrary';
