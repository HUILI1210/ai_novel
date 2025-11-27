import React, { useState, memo, useEffect } from 'react';
import { ScriptTemplate, CharacterConfig } from '../types';
import { createScript, generatePlotFrameworkPrompt, updateScript, isPresetScript } from '../services/scriptLibraryService';

interface ScriptEditorProps {
  onSave: (script: ScriptTemplate) => void;
  onCancel: () => void;
  onGeneratePlot: (prompt: string) => Promise<string>;
  initialScript?: ScriptTemplate;
  isEditing?: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = memo(({
  onSave,
  onCancel,
  onGeneratePlot,
  initialScript,
  isEditing = false
}) => {
  const [name, setName] = useState(initialScript?.name || '');
  const [description, setDescription] = useState(initialScript?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const isPreset = isEditing && initialScript ? isPresetScript(initialScript.id) : false;
  const canEditCharacter = isEditing ? !isPreset : true;
  const [setting, setSetting] = useState(initialScript?.setting || '现代日本高中');
  const [plotFramework, setPlotFramework] = useState(initialScript?.plotFramework || '');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [character, setCharacter] = useState<CharacterConfig>(initialScript?.character || {
    name: '',
    personality: '',
    appearance: '',
    relationship: ''
  });

  const updateCharacter = (field: keyof CharacterConfig, value: string) => {
    setCharacter(prev => ({ ...prev, [field]: value }));
  };

  const handleGeneratePlot = async () => {
    if (!character.name || !character.personality) {
      alert('请先填写角色名称和性格');
      return;
    }
    
    setIsGenerating(true);
    try {
      const prompt = generatePlotFrameworkPrompt(character, setting);
      const generatedPlot = await onGeneratePlot(prompt);
      setPlotFramework(generatedPlot);
    } catch (e) {
      console.error('生成剧情失败:', e);
      alert('生成剧情失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入剧本名称');
      return;
    }
    if (!character.name.trim()) {
      alert('请输入角色名称');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && initialScript) {
        // 编辑模式：更新现有剧本
        const updates: Partial<ScriptTemplate> = {
          name,
          description,
          plotFramework
        };
        
        // 如果不是预设剧本，可以修改更多字段
        if (!isPreset) {
          updates.setting = setting;
          updates.character = character;
        }
        
        const updatedScript: ScriptTemplate = {
          ...initialScript,
          ...updates,
        };
        updateScript(updatedScript);
        onSave(updatedScript);
      } else {
        // 创建模式：创建新剧本
        const script = createScript(name, character, plotFramework, setting, description);
        onSave(script);
      }
    } catch (e) {
      console.error('保存失败:', e);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-amber-400">
            {isEditing ? '✏️ 编辑剧本' : '✨ 创建新剧本'}
          </h2>
          <p className="text-slate-400 mt-1">
            {isEditing 
              ? (isPreset ? '修改预设剧本（部分字段受限）' : '编辑剧本内容')
              : '定制你的专属故事角色和剧情'
            }
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* 剧本基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              📖 剧本信息
            </h3>
            <input
              type="text"
              placeholder="剧本名称 *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="剧本描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="故事背景设定"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              disabled={isPreset}
              className={`w-full px-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:border-amber-500 ${
                isPreset 
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-700 border-slate-600 text-slate-100'
              }`}
            />
            {isPreset && (
              <p className="text-xs text-slate-500">预设剧本无法修改故事背景</p>
            )}
          </div>

          {/* 角色配置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              👤 角色配置
              {!canEditCharacter && (
                <span className="text-sm text-slate-400 font-normal">
                  （预设剧本无法修改）
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="角色名称 *"
                value={character.name}
                onChange={(e) => updateCharacter('name', e.target.value)}
                disabled={!canEditCharacter}
                className={`px-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:border-amber-500 ${
                  !canEditCharacter 
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-700 border-slate-600 text-slate-100'
                }`}
              />
              <input
                type="text"
                placeholder="与主角的关系"
                value={character.relationship}
                onChange={(e) => updateCharacter('relationship', e.target.value)}
                disabled={!canEditCharacter}
                className={`px-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:border-amber-500 ${
                  !canEditCharacter 
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-700 border-slate-600 text-slate-100'
                }`}
              />
            </div>
            <textarea
              placeholder="角色性格描述（如：傲娇、温柔、活泼等）"
              value={character.personality}
              onChange={(e) => updateCharacter('personality', e.target.value)}
              rows={2}
              disabled={!canEditCharacter}
              className={`w-full px-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none ${
                !canEditCharacter 
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-700 border-slate-600 text-slate-100'
              }`}
            />
            <textarea
              placeholder="角色外貌描述（用于AI生成立绘）"
              value={character.appearance}
              onChange={(e) => updateCharacter('appearance', e.target.value)}
              rows={2}
              disabled={!canEditCharacter}
              className={`w-full px-4 py-3 border rounded-lg placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none ${
                !canEditCharacter 
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-700 border-slate-600 text-slate-100'
              }`}
            />
          </div>

          {/* 剧情框架 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                🎬 剧情框架
              </h3>
              <button
                onClick={handleGeneratePlot}
                disabled={isGenerating}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    生成中...
                  </>
                ) : (
                  <>🤖 AI 生成剧情</>
                )}
              </button>
            </div>
            <textarea
              placeholder="描述你想要的剧情框架，或点击 AI 生成按钮自动生成..."
              value={plotFramework}
              onChange={(e) => setPlotFramework(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : (isEditing ? '💾 保存更改' : '💾 保存剧本')}
          </button>
        </div>
      </div>
    </div>
  );
});

ScriptEditor.displayName = 'ScriptEditor';
