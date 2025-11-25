import React, { memo } from 'react';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { AI_PROVIDER } from '../constants/config';

interface MainMenuProps {
  hasApiKey: boolean;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onErrorClose: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = memo(({
  hasApiKey,
  isLoading,
  error,
  onStart,
  onErrorClose
}) => (
  <div className="relative w-full h-screen bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
    {/* Background Animation */}
    <div className="absolute inset-0 opacity-30">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/anime_school/1920/1080')] bg-cover bg-center filter blur-sm scale-110"></div>
    </div>
    
    <div className="z-10 text-center p-8">
      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 mb-6 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
        爱子的回响
      </h1>
      <p className="text-slate-300 text-xl mb-12 tracking-wider font-light">
        AI 生成的日系恋爱视觉小说
      </p>
      
      {!hasApiKey ? (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
          环境变量 DASHSCOPE_API_KEY 缺失。
        </div>
      ) : (
        <button
          onClick={onStart}
          disabled={isLoading}
          className="px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xl rounded-full shadow-[0_0_30px_rgba(236,72,153,0.4)] 
                     hover:scale-105 hover:shadow-[0_0_50px_rgba(236,72,153,0.6)] transition-all duration-300"
        >
          {isLoading ? "正在初始化..." : "开始游戏"}
        </button>
      )}
    </div>
    
    {/* Footer */}
    <div className="absolute bottom-4 text-slate-500 text-sm">
      Powered by {AI_PROVIDER === 'gemini' ? 'Google Gemini' : '阿里云 DashScope'}
    </div>
    
    <LoadingOverlay isLoading={isLoading} />
    <ErrorOverlay error={error} onClose={onErrorClose} />
  </div>
));

MainMenu.displayName = 'MainMenu';
