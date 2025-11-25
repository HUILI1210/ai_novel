import React, { memo } from 'react';

interface StatusPanelProps {
  turn: number;
  affection: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = memo(({ 
  turn, 
  affection, 
  isMuted, 
  onToggleMute 
}) => (
  <div className="absolute top-4 left-4 z-40 flex gap-4">
    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm font-mono shadow-lg">
      <span className="text-slate-400 mr-2">回合</span>
      <span className="text-white font-bold">{turn}</span>
    </div>
    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 text-slate-200 text-sm font-mono shadow-lg flex items-center">
      <span className="text-pink-400 mr-2">♥</span>
      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-1000"
          style={{ width: `${affection}%` }}
        />
      </div>
    </div>
    <button 
      onClick={onToggleMute}
      className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg w-10 h-10 flex items-center justify-center text-slate-200 hover:bg-slate-800 transition-colors"
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  </div>
));

StatusPanel.displayName = 'StatusPanel';
