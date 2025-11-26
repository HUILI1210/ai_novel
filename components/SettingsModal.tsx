import React, { memo } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SettingsModalProps {
  isOpen: boolean;
  dialogueOpacity: number;
  isMuted: boolean;
  onClose: () => void;
  onOpacityChange: (opacity: number) => void;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = memo(({ 
  isOpen, 
  dialogueOpacity,
  isMuted,
  onClose,
  onOpacityChange,
  onToggleMute
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* 点击背景关闭 */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <div 
        className="relative w-full max-w-xl bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-8 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
        
        {/* 标题栏 */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-pink-500">⚙️</span> 系统设置
          </h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* 1. UI主题 */}
          <section className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <ThemeSwitcher />
          </section>

          {/* 2. 对话框透明度 */}
          <section className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <div className="flex justify-between mb-3">
              <label className="text-slate-200 font-medium">💬 对话框透明度</label>
              <span className="text-pink-400 font-mono">{dialogueOpacity}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              value={dialogueOpacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>透明</span>
              <span>不透明</span>
            </div>
          </section>

          {/* 3. 音频设置 */}
          <section className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 flex items-center justify-between">
            <div>
              <div className="text-slate-200 font-medium mb-1">🔊 全局静音</div>
              <div className="text-slate-500 text-sm">关闭背景音乐和音效</div>
            </div>
            
            <button
              onClick={onToggleMute}
              className={`w-14 h-8 rounded-full transition-colors relative ${isMuted ? 'bg-pink-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${isMuted ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </section>
        </div>

        {/* 底部按钮 */}
        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl shadow-lg shadow-pink-500/20 transition-all hover:scale-105"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
});

SettingsModal.displayName = 'SettingsModal';
