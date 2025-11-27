import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoPlayOptions {
  isTyping: boolean;
  isLoading: boolean;
  showChoices: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isVoiceEnabled: boolean;
  dialogueLength: number;
  onNext: () => void;
}

export function useAutoPlay({
  isTyping,
  isLoading,
  showChoices,
  isPaused,
  isGameOver,
  isVoiceEnabled,
  dialogueLength,
  onNext,
}: UseAutoPlayOptions) {
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  
  // 保持最新的 onNext 引用
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  // 自动播放定时器
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    // 只有在非打字状态、非加载状态、非选择状态、非暂停状态且游戏未结束时才自动播放
    if (isAutoPlay && !isTyping && !isLoading && !showChoices && !isPaused && !isGameOver) {
      // 计算延迟：根据文本长度动态调整
      const charTime = isVoiceEnabled ? 250 : 150;
      const baseDelay = isVoiceEnabled ? 2000 : 1500;
      const delay = Math.max(2000, dialogueLength * charTime + baseDelay);
      
      console.log(`[AutoPlay] Starting timer. Delay: ${delay}ms`);

      timeout = setTimeout(() => {
        console.log('[AutoPlay] Timer triggered');
        if (!showChoices && !isPaused) {
          onNextRef.current();
        }
      }, delay);
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [
    isAutoPlay, 
    isTyping, 
    isLoading, 
    showChoices, 
    isPaused,
    isGameOver,
    dialogueLength,
    isVoiceEnabled
  ]);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(prev => !prev);
  }, []);

  return {
    isAutoPlay,
    toggleAutoPlay,
  };
}
