import React, { memo, useRef, useEffect, useState } from 'react';
import { SceneData } from '../types';

interface HistoryPanelProps {
  isVisible: boolean;
  history: SceneData[];
  onClose: () => void;
  onJumpToHistory?: (index: number) => void;
  canJump?: boolean;  // 是否可以回跳（仅剧本模式）
}

export const HistoryPanel: React.FC<HistoryPanelProps> = memo(({
  isVisible,
  history,
  onClose,
  onJumpToHistory,
  canJump = false
}) => {
  const [confirmJumpIndex, setConfirmJumpIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // 重置确认状态
    setConfirmJumpIndex(null);
  }, [isVisible]);

  const handleJump = (index: number) => {
    if (confirmJumpIndex === index) {
      // 确认回跳
      onJumpToHistory?.(index);
      onClose();
    } else {
      // 显示确认
      setConfirmJumpIndex(index);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            📜 剧情回顾
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* History Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              暂无对话历史
            </div>
          ) : (
            history.map((scene, index) => {
              const canJumpToThis = canJump && scene.historyChapterIndex !== undefined && index < history.length - 1;
              const isConfirming = confirmJumpIndex === index;
              
              return (
                <div key={index} className="space-y-2 group relative">
                  {/* Narrative */}
                  {scene.narrative && (
                    <div className="text-slate-400 text-sm italic px-4 py-2 bg-slate-900/50 rounded-lg">
                      {scene.narrative}
                    </div>
                  )}
                  
                  {/* Dialogue */}
                  <div className={`flex gap-3 ${scene.speaker === '你' ? 'flex-row-reverse' : ''}`}>
                    {/* Speaker Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                      scene.speaker === '你' 
                        ? 'bg-blue-600' 
                        : scene.speaker === '旁白'
                          ? 'bg-slate-600'
                          : 'bg-pink-600'
                    }`}>
                      {scene.speaker === '你' ? '👤' : scene.speaker === '旁白' ? '📖' : '💗'}
                    </div>
                    
                    {/* Dialogue Bubble */}
                    <div className={`flex-1 max-w-[80%] ${scene.speaker === '你' ? 'text-right' : ''}`}>
                      <div className="text-xs text-slate-500 mb-1">
                        {scene.speaker}
                      </div>
                      <div className={`inline-block px-4 py-3 rounded-2xl ${
                        scene.speaker === '你'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : scene.speaker === '旁白'
                            ? 'bg-slate-700 text-slate-300 rounded-tl-none'
                            : 'bg-pink-600/20 text-pink-100 border border-pink-500/30 rounded-tl-none'
                      }`}>
                        {scene.dialogue}
                      </div>
                    </div>

                    {/* Jump Button */}
                    {canJumpToThis && (
                      <button
                        onClick={() => handleJump(index)}
                        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all
                          ${isConfirming 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-600 hover:text-white'}`}
                      >
                        {isConfirming ? '确认回跳?' : '↩️ 回到此处'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
});

HistoryPanel.displayName = 'HistoryPanel';
