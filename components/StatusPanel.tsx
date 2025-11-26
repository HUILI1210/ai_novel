import React, { memo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface StatusPanelProps {
  turn: number;
  affection: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause?: () => void;
  onOpenHistory?: () => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = memo(({ 
  turn, 
  affection, 
  isMuted, 
  onToggleMute,
  onPause,
  onOpenHistory
}) => {
  const { themeConfig } = useTheme();

  // 提取通用按钮样式
  const buttonStyle = {
    background: themeConfig.dialogueBox.background,
    border: themeConfig.dialogueBox.border,
    color: themeConfig.dialogueBox.textColor,
    backdropFilter: themeConfig.dialogueBox.backdropBlur
  };

  return (
    <div className="absolute top-4 left-4 z-40 flex gap-4">
      <div 
        className="rounded-lg px-4 py-2 text-sm font-mono shadow-lg flex items-center"
        style={buttonStyle}
      >
        <span className="opacity-70 mr-2">回合</span>
        <span className="font-bold">{turn}</span>
      </div>
      
      <div 
        className="rounded-lg px-4 py-2 text-sm font-mono shadow-lg flex items-center"
        style={buttonStyle}
      >
        <span className="text-pink-400 mr-2">♥</span>
        <div className="w-24 h-2 bg-black/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-1000"
            style={{ width: `${affection}%` }}
          />
        </div>
      </div>

      <button 
        onClick={onToggleMute}
        className="rounded-lg w-10 h-10 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={buttonStyle}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      
      {onOpenHistory && (
        <button 
          onClick={onOpenHistory}
          className="rounded-lg w-10 h-10 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={buttonStyle}
          title="文本回顾"
        >
          📜
        </button>
      )}

      {onPause && (
        <button 
          onClick={onPause}
          className="rounded-lg w-10 h-10 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={buttonStyle}
        >
          ⏸️
        </button>
      )}
    </div>
  );
});

StatusPanel.displayName = 'StatusPanel';
