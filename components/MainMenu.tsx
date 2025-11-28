import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Book, Settings, Sparkles, FolderOpen } from 'lucide-react';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorOverlay } from './ErrorOverlay';
import { SakuraEffect } from './SakuraEffect';
import { AI_PROVIDER } from '../constants/config';
import { hasAnySave, getLatestSave, SaveData } from '../services/saveService';
import { getAssetPath } from '../utils/assetPath';

// 女主角立绘URL (使用本地透明背景图片)
const HEROINE_IMAGE = getAssetPath('/stories/02_princess_elena/expressions/smiling.png');

interface MainMenuProps {
  hasApiKey: boolean;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onErrorClose: () => void;
  onOpenScriptLibrary: () => void;
  onOpenSettings: () => void;
  onContinueGame?: (saveData: SaveData) => void;
}

export const MainMenu: React.FC<MainMenuProps> = memo(({
  hasApiKey,
  isLoading,
  error,
  onStart,
  onErrorClose,
  onOpenScriptLibrary,
  onOpenSettings,
  onContinueGame
}) => {
  const [hasSaves, setHasSaves] = useState(false);
  const [latestSave, setLatestSave] = useState<SaveData | null>(null);

  useEffect(() => {
    setHasSaves(hasAnySave());
    setLatestSave(getLatestSave());
  }, []);

  const handleContinue = () => {
    if (latestSave && onContinueGame) {
      onContinueGame(latestSave);
    }
  };

  return (
  <div className="relative w-full h-screen flex items-center overflow-hidden font-sans bg-[#0f172a]">
    {/* 1. 背景层 - 保持简洁，使用深色渐变或原有图片 */}
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920')] bg-cover bg-center opacity-40"></div>
      {/* 氛围遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
    </div>
    
    {/* 樱花特效 */}
    <SakuraEffect petalCount={20} />
    
    {/* 2. 女主角立绘 (右侧展示) */}
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="absolute right-[-10%] md:right-0 bottom-0 w-full md:w-2/3 h-[90%] flex items-end justify-center pointer-events-none z-10"
    >
      {/* 简单的背后光晕 */}
      <div className="absolute bottom-0 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[100px]"></div>
      <img 
        src={HEROINE_IMAGE}
        alt="女主角"
        className="h-full w-auto object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      />
    </motion.div>
    
    {/* 3. 左侧UI内容区 - 左对齐布局 */}
    <div className="relative z-20 pl-8 md:pl-24 w-full max-w-5xl flex flex-col items-start justify-center h-full">
      
      {/* 标题组 - 保持原有风格 */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="mb-12 relative"
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-white drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-white to-pink-200">
            旮旯积木大王
          </span>
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold italic text-pink-400 mt-4 tracking-[0.2em] uppercase">
          Gala Block Master
        </h2>
        <div className="h-1.5 w-24 bg-pink-500 mt-4 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.8)]"></div>
      </motion.div>

      {/* 描述框 */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-10 backdrop-blur-md bg-slate-900/40 border-l-4 border-pink-500 rounded-r-xl p-6 max-w-xl shadow-lg"
      >
        <div className="flex items-center gap-2 text-pink-300 font-bold mb-1 text-lg">
          <Sparkles size={18} />
          <span>AI 驱动的恋爱积木</span>
        </div>
        <p className="text-slate-200 text-lg font-medium tracking-wide">
          拼凑剧情碎片，构建你的二次元梦境。
        </p>
      </motion.div>
      
      {/* 菜单按钮组 - 卡片式设计 */}
      {!hasApiKey ? (
        <div className="p-6 bg-red-900/80 border-l-4 border-red-500 rounded-r-lg text-white mb-8 backdrop-blur-md max-w-lg">
          <h3 className="font-bold text-xl mb-2 flex items-center gap-2">⚠️ 配置缺失</h3>
          <p>环境变量 {AI_PROVIDER === 'openrouter' ? 'VITE_OPENROUTER_API_KEY' : 'GEMINI_API_KEY'} 缺失。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 w-full max-w-md">
          {/* 选择剧本按钮 - 主按钮 */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, x: 10 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenScriptLibrary}
            disabled={isLoading}
            className="group relative w-full py-4 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-left rounded-xl shadow-lg border border-white/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-full">
                  {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Book size={24} />}
                </div>
                <div>
                  <div className="text-xl font-bold">选择剧本 (Select)</div>
                  <div className="text-xs text-pink-100 font-mono opacity-80">开启新的冒险</div>
                </div>
              </div>
              <div className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">→</div>
            </div>
          </motion.button>

          {/* 继续游戏按钮 - 有存档时显示 */}
          {hasSaves && latestSave && (
            <motion.button
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, x: 10 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              disabled={isLoading}
              className="group relative w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-left rounded-xl shadow-lg border border-white/10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Play size={24} fill="currentColor" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">继续游戏 (Continue)</div>
                    <div className="text-xs text-emerald-100 font-mono opacity-80">
                      {latestSave.scriptTitle} · 第{latestSave.chapterIndex + 1}章
                    </div>
                  </div>
                </div>
                <div className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">→</div>
              </div>
            </motion.button>
          )}

          {/* 读取存档按钮 */}
          <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: hasSaves ? 0.6 : 0.5 }}
            whileHover={{ scale: 1.02, x: 10 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            disabled={isLoading || !hasSaves}
            className={`group relative w-full py-4 px-6 backdrop-blur-md text-white text-left rounded-xl shadow-lg border overflow-hidden transition-colors
              ${hasSaves 
                ? 'bg-slate-800/60 hover:bg-slate-700/80 border-white/10 hover:border-cyan-400/50' 
                : 'bg-slate-800/30 border-slate-700/30 cursor-not-allowed opacity-50'}`}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-2 bg-slate-700/50 rounded-full group-hover:bg-cyan-900/50 transition-colors">
                <FolderOpen size={24} className="text-slate-300 group-hover:text-cyan-300" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-200 group-hover:text-white">读取存档 (Load)</div>
                <div className="text-xs text-slate-400 font-mono group-hover:text-cyan-200">
                  {hasSaves ? '选择存档继续' : '暂无存档'}
                </div>
              </div>
            </div>
          </motion.button>

           {/* 设置按钮 */}
           <motion.button
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02, x: 10 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenSettings}
            disabled={isLoading}
            className="group relative w-full py-4 px-6 bg-slate-800/40 hover:bg-slate-700/60 backdrop-blur-md text-white text-left rounded-xl shadow-lg border border-white/5 hover:border-purple-400/50 overflow-hidden transition-colors"
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-2 bg-slate-700/30 rounded-full group-hover:bg-purple-900/30 transition-colors">
                <Settings size={24} className="text-slate-400 group-hover:text-purple-300" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-300 group-hover:text-white">系统设置 (Settings)</div>
                <div className="text-xs text-slate-500 font-mono group-hover:text-purple-200">调整参数</div>
              </div>
            </div>
          </motion.button>
        </div>
      )}
      
      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-10 text-slate-500/60 text-xs font-mono tracking-widest uppercase"
      >
        Powered by {AI_PROVIDER === 'openrouter' ? 'Gemini 2.5 (OpenRouter)' : 'Gemini 2.5'} • GALA ENGINE V3.0
      </motion.div>
    </div>
    
    <LoadingOverlay isLoading={isLoading} />
    <ErrorOverlay error={error} onClose={onErrorClose} />
    
    <style>{`
      .text-outline {
        text-shadow: 
          -1px -1px 0 #000,  
           1px -1px 0 #000,
          -1px  1px 0 #000,
           1px  1px 0 #000;
      }
    `}</style>
  </div>
  );
});

MainMenu.displayName = 'MainMenu';
