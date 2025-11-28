import React, { useState, memo, useEffect, useCallback } from 'react';
import { ScriptTemplate } from '../types';
import { getAllScripts, deleteScript, isPresetScript, hasGeneratedPlot, saveGeneratedPlot, setScriptAIMode, resetScriptMode } from '../services/scriptLibraryService';
import { getBestEnding, getEndingDescription } from '../services/gameRecordService';
import { generateFullPlot } from '../services/aiService';
import { ScriptEditor } from './ScriptEditor';
import { hasPreloadedScript } from '../services/scriptPlayerService';

// 模式筛选类型
type ModeFilter = 'all' | 'script' | 'ai';

// 角色预览图映射 (从 stories 文件夹加载)
const CHARACTER_PREVIEW_IMAGES: Record<string, string> = {
  '雯曦': '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
  '艾琳娜': '/stories/02_princess_elena/expressions/smiling.png',
  '柳如烟': '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png', // TODO: 生成柳如烟的立绘
};

const getCharacterPreviewImage = (characterName: string): string => {
  return CHARACTER_PREVIEW_IMAGES[characterName] || '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png';
};

interface ScriptLibraryProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectScript: (script: ScriptTemplate) => void;
  onCreateNew: () => void;
}

interface GenerateStatus {
  scriptId: string;
  status: string;
  isGenerating: boolean;
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
  const [generatedScripts, setGeneratedScripts] = useState<Set<string>>(new Set());
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus | null>(null);
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

  // 计算剧本的实际运行模式
  const getActualMode = useCallback((script: ScriptTemplate): 'script' | 'ai' => {
    // 优先使用显式设置
    if (script.useAIMode === true) return 'ai';
    // 如果有预加载剧本文件，默认使用剧本模式
    if (hasPreloadedScript(script.id)) return 'script';
    // 其他情况使用AI模式
    return 'ai';
  }, []);

  // 切换剧本模式
  const handleToggleMode = useCallback((script: ScriptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentMode = getActualMode(script);
    
    if (currentMode === 'script') {
      // 切换到AI模式前确认
      if (confirm('切换到 AI 模式后，将使用 AI 实时生成剧情，不会使用预设剧本内容。\n\n注意：原有剧本文件不会被删除，可随时切换回剧本模式。\n\n确定切换吗？')) {
        setScriptAIMode(script.id, true);
        setScripts(getAllScripts());
      }
    } else {
      // 切换回剧本模式（只有有预加载的剧本才能切换回来）
      if (hasPreloadedScript(script.id)) {
        resetScriptMode(script.id);
        setScripts(getAllScripts());
      } else {
        alert('该剧本没有预设剧情文件，只能使用 AI 模式。');
      }
    }
  }, [getActualMode]);

  // 筛选后的剧本列表
  const filteredScripts = scripts.filter(script => {
    if (modeFilter === 'all') return true;
    const actualMode = getActualMode(script);
    return actualMode === modeFilter;
  });

  useEffect(() => {
    if (isVisible) {
      const allScripts = getAllScripts();
      setScripts(allScripts);
      // 检查哪些剧本已生成剧情
      const generated = new Set<string>();
      allScripts.forEach(script => {
        if (hasGeneratedPlot(script.id)) {
          generated.add(script.id);
        }
      });
      setGeneratedScripts(generated);
    }
  }, [isVisible]);

  // 一键生成剧情全文
  const handleGeneratePlot = useCallback(async (script: ScriptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (generateStatus?.isGenerating) {
      alert('正在生成中，请稍候...');
      return;
    }

    if (hasGeneratedPlot(script.id)) {
      if (!confirm('该剧本已有生成的剧情，是否重新生成？')) {
        return;
      }
    }

    setGenerateStatus({
      scriptId: script.id,
      status: '准备生成...',
      isGenerating: true
    });

    try {
      const plot = await generateFullPlot(
        script.character.name,
        script.character.personality,
        script.character.appearance,
        script.character.relationship,
        script.setting,
        (status) => {
          setGenerateStatus(prev => prev ? { ...prev, status } : null);
        }
      );

      // 保存生成的剧情
      saveGeneratedPlot(script.id, plot);
      setGeneratedScripts(prev => new Set([...prev, script.id]));
      
      // 更新剧本列表
      setScripts(getAllScripts());

      setGenerateStatus({
        scriptId: script.id,
        status: '✓ 生成完成！',
        isGenerating: false
      });

      setTimeout(() => {
        setGenerateStatus(null);
      }, 2000);

    } catch (error) {
      console.error('生成剧情失败:', error);
      setGenerateStatus({
        scriptId: script.id,
        status: `❌ 生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        isGenerating: false
      });

      setTimeout(() => {
        setGenerateStatus(null);
      }, 3000);
    }
  }, [generateStatus]);

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
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
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
          {/* 模式筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">筛选：</span>
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                modeFilter === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setModeFilter('script')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                modeFilter === 'script' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              📖 剧本模式
            </button>
            <button
              onClick={() => setModeFilter('ai')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                modeFilter === 'ai' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              🤖 AI 模式
            </button>
          </div>
        </div>

        {/* Script List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredScripts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              没有符合条件的剧本
            </div>
          ) : filteredScripts.map((script) => (
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
                    {/* 剧本模式/AI模式标识 - 可点击切换 */}
                    {(() => {
                      const actualMode = getActualMode(script);
                      const canSwitch = hasPreloadedScript(script.id); // 有预加载的才能切换
                      return (
                        <button
                          onClick={(e) => handleToggleMode(script, e)}
                          className={`px-2 py-0.5 text-xs rounded-full text-white transition-all ${
                            actualMode === 'script'
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                          } ${canSwitch ? 'cursor-pointer' : 'cursor-default'}`}
                          title={canSwitch 
                            ? `点击切换模式（当前：${actualMode === 'script' ? '剧本模式' : 'AI模式'}）` 
                            : 'AI模式（无预设剧情文件）'}
                        >
                          {actualMode === 'script' ? '📖 剧本模式' : '🤖 AI模式'}
                          {canSwitch && ' ⇄'}
                        </button>
                      );
                    })()}
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
                
                <div className="flex gap-1 items-center flex-wrap">
                      {/* 一键生成剧情按钮 */}
                      {generateStatus?.scriptId === script.id ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          generateStatus.isGenerating ? 'bg-purple-600/30 text-purple-400 animate-pulse' : 
                          generateStatus.status.includes('✓') ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'
                        }`}>
                          {generateStatus.status}
                        </span>
                      ) : generatedScripts.has(script.id) ? (
                        <span className="px-2 py-1 text-xs bg-emerald-600/30 text-emerald-400 rounded-full flex items-center gap-1">
                          ✓ 已生成
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleGeneratePlot(script, e)}
                          className="px-2 py-1 text-xs bg-purple-600/30 text-purple-400 rounded-full hover:bg-purple-600/50 transition-colors flex items-center gap-1"
                          title="一键生成完整剧情（约5000字）"
                        >
                          ✨ 生成剧情
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
