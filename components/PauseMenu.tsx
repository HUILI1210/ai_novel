import React, { memo } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';

interface PauseMenuProps {
  isVisible: boolean;
  dialogueOpacity: number;
  onResume: () => void;
  onReturnToTitle: () => void;
  onOpacityChange: (opacity: number) => void;
  onSave?: () => void;
  onLoad?: () => void;
  onQuickSaveAndExit?: () => void;
  canSave?: boolean;
}

export const PauseMenu: React.FC<PauseMenuProps> = memo(({
  isVisible,
  dialogueOpacity,
  onResume,
  onReturnToTitle,
  onOpacityChange,
  onSave,
  onLoad,
  onQuickSaveAndExit,
  canSave = true
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800/95 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold text-center text-amber-400 mb-8">⏸️ 游戏暂停</h2>
        
        {/* 对话框透明度设置 */}
        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl">
          <label className="block text-slate-300 mb-3 font-medium">
            💬 对话框透明度: {dialogueOpacity}%
          </label>
          <input
            type="range"
            min="30"
            max="100"
            value={dialogueOpacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>透明</span>
            <span>不透明</span>
          </div>
        </div>

        {/* UI主题切换 */}
        <div className="mb-8 p-4 bg-slate-900/50 rounded-xl">
          <ThemeSwitcher />
        </div>

        {/* 菜单按钮 */}
        <div className="space-y-4">
          <button
            onClick={onResume}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            ▶️ 继续游戏
          </button>

          {/* 存档/读档按钮 */}
          <div className="flex gap-3">
            {onSave && (
              <button
                onClick={onSave}
                disabled={!canSave}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-opacity flex items-center justify-center gap-2
                  ${canSave 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90' 
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
              >
                💾 保存
              </button>
            )}
            {onLoad && (
              <button
                onClick={onLoad}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                📂 读档
              </button>
            )}
          </div>
          
          {/* 快速存档退出 */}
          {onQuickSaveAndExit && canSave && (
            <button
              onClick={onQuickSaveAndExit}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              💾 存档并退出
            </button>
          )}
          
          <button
            onClick={onReturnToTitle}
            className="w-full py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            🏠 返回标题
          </button>
        </div>
      </div>
    </div>
  );
});

PauseMenu.displayName = 'PauseMenu';
