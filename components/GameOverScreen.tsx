import React, { memo, useEffect } from 'react';
import { determineEndingType, getEndingDescription } from '../services/gameRecordService';

interface GameOverScreenProps {
  narrative: string;
  affection: number;
  turnsPlayed: number;
  characterName: string;
  onReturnToTitle: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = memo(({ 
  narrative, 
  affection,
  turnsPlayed,
  characterName,
  onReturnToTitle
}) => {
  const endingType = determineEndingType(affection);
  const endingDesc = getEndingDescription(endingType);
  
  const bgGradient = endingType === 'good' 
    ? 'from-pink-900/50 via-black to-purple-900/50'
    : endingType === 'normal'
      ? 'from-blue-900/50 via-black to-slate-900/50'
      : 'from-red-900/50 via-black to-slate-900/50';

  return (
    <div className={`relative w-full h-screen bg-gradient-to-br ${bgGradient} flex flex-col items-center justify-center text-center p-8`}>
      {/* 结局类型标识 */}
      <div className={`text-6xl mb-4 ${
        endingType === 'good' ? 'animate-pulse' : ''
      }`}>
        {endingType === 'good' ? '🌸' : endingType === 'normal' ? '🌙' : '💔'}
      </div>
      
      <h1 className="text-5xl text-white font-serif mb-2">剧终</h1>
      <p className={`text-2xl mb-6 font-bold ${
        endingType === 'good' ? 'text-pink-400' :
        endingType === 'normal' ? 'text-blue-400' : 'text-red-400'
      }`}>
        {endingDesc}
      </p>
      
      <p className="text-slate-400 mb-8 italic max-w-lg">"{narrative}"</p>
      
      {/* 统计信息 */}
      <div className="bg-slate-900/50 rounded-xl p-6 mb-8 border border-slate-700">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-pink-400">{affection}</div>
            <div className="text-sm text-slate-500">最终好感度</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{turnsPlayed}</div>
            <div className="text-sm text-slate-500">游戏回合</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{characterName}</div>
            <div className="text-sm text-slate-500">攻略角色</div>
          </div>
        </div>
      </div>
      
      <button 
        onClick={onReturnToTitle}
        className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full font-bold hover:opacity-90 transition-opacity"
      >
        🏠 返回标题
      </button>
    </div>
  );
});

GameOverScreen.displayName = 'GameOverScreen';
