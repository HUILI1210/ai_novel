import React, { memo } from 'react';
import { AFFECTION_GOOD_ENDING_THRESHOLD } from '../constants/config';

interface GameOverScreenProps {
  narrative: string;
  affection: number;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = memo(({ 
  narrative, 
  affection 
}) => (
  <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center text-center p-8">
    <h1 className="text-5xl text-white font-serif mb-4">剧终</h1>
    <p className="text-slate-400 mb-8 italic">"{narrative}"</p>
    <div className="text-2xl mb-8">
      最终好感度: <span className={affection > AFFECTION_GOOD_ENDING_THRESHOLD ? "text-pink-400" : "text-blue-400"}>{affection}</span>
    </div>
    <button 
      onClick={() => window.location.reload()}
      className="px-8 py-3 border border-white text-white hover:bg-white hover:text-black transition-colors"
    >
      返回标题
    </button>
  </div>
));

GameOverScreen.displayName = 'GameOverScreen';
