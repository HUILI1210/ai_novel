import React, { memo } from 'react';

interface EndingInfo {
  type: string;
  title: string;
  description: string;
}

interface ScriptEndingScreenProps {
  ending: EndingInfo;
  affection: number;
  turnsPlayed: number;
  characterName: string;
  scriptTitle: string;
  onReturnToTitle: () => void;
}

export const ScriptEndingScreen: React.FC<ScriptEndingScreenProps> = memo(({ 
  ending,
  affection,
  turnsPlayed,
  characterName,
  scriptTitle,
  onReturnToTitle
}) => {
  const isTrueEnd = ending.type === 'true_end';
  
  const bgGradient = isTrueEnd 
    ? 'from-rose-900/60 via-black to-amber-900/40'
    : 'from-blue-900/50 via-black to-slate-900/50';

  return (
    <div className={`relative w-full h-screen bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center text-center p-8 overflow-hidden`}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isTrueEnd && (
          <>
            {/* 金色粒子效果 */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-amber-400/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 5}s`
                }}
              />
            ))}
          </>
        )}
      </div>
      
      {/* 结局图标 */}
      <div className={`text-8xl mb-6 ${isTrueEnd ? 'animate-pulse' : ''}`}>
        {isTrueEnd ? '👑' : '🌹'}
      </div>
      
      {/* 剧本标题 */}
      <p className="text-amber-400/80 text-sm mb-2 tracking-widest uppercase">
        {scriptTitle}
      </p>
      
      {/* 结局标题 */}
      <h1 className="text-5xl text-white font-serif mb-4 drop-shadow-lg">
        {ending.title}
      </h1>
      
      {/* 结局类型标签 */}
      <div className={`px-4 py-1 rounded-full text-sm font-bold mb-6 ${
        isTrueEnd 
          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white' 
          : 'bg-slate-700 text-slate-300'
      }`}>
        {isTrueEnd ? '🎉 TRUE END' : 'NORMAL END'}
      </div>
      
      {/* 结局描述 */}
      <div className="max-w-md mb-8 space-y-2">
        {ending.description.split('\n').map((line, i) => (
          <p key={i} className="text-slate-300 text-lg">
            {line}
          </p>
        ))}
      </div>
      
      {/* 统计信息 */}
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-rose-400">♥ {affection}</div>
            <div className="text-xs text-slate-500 mt-1">最终好感度</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{turnsPlayed}</div>
            <div className="text-xs text-slate-500 mt-1">游戏回合</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{characterName}</div>
            <div className="text-xs text-slate-500 mt-1">攻略角色</div>
          </div>
        </div>
      </div>
      
      {/* 返回按钮 */}
      <button 
        onClick={onReturnToTitle}
        className="px-10 py-4 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-rose-900/50"
      >
        🏠 返回标题画面
      </button>
      
      {/* 底部装饰 */}
      <p className="absolute bottom-4 text-slate-600 text-xs">
        感谢您的游玩 ✨
      </p>
    </div>
  );
});

ScriptEndingScreen.displayName = 'ScriptEndingScreen';
