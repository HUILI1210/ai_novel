import React, { useState, useEffect, memo, useMemo } from 'react';
import { audioService } from '../services/audioService';
import { TYPING_SPEED_MS, TYPING_SOUND_INTERVAL } from '../constants/config';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/animations.css';

/**
 * 清理对话文本，修复AI生成的常见错误
 */
const cleanDialogueText = (text: string): string => {
  if (!text) return '';
  
  let cleaned = text;
  
  // 第一步：修复特定的漏字问题（在重复字清理之前）
  const preFixPatterns: [RegExp, string][] = [
    [/樱飞飞/g, '樱花飞'],
    [/樱飞散/g, '樱花飞散'],
    [/放后/g, '放学后'],
    [/回到到校/g, '回到学校'],
    [/到到校/g, '到学校'],
    [/谁你担心/g, '谁要你担心'],
  ];
  
  for (const [pattern, replacement] of preFixPatterns) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // 第二步：修复连续重复的汉字
  cleaned = cleaned.replace(/(.)\1{1,}/g, (match, char) => {
    // 保留合法的重复字符
    const allowedRepeats = ['。', '！', '？', '…', '.', '!', '?', '～', '~', '哈', '呵', '嘿', '嗯', '啊', '呀', '哦', '噢'];
    if (allowedRepeats.includes(char)) {
      return match.length > 3 ? char.repeat(3) : match;
    }
    return char;
  });
  
  // 第三步：修复重复字清理后的残留问题
  const postFixPatterns: [RegExp, string][] = [
    [/樱飞散/g, '樱花飞散'],
    [/樱飞的/g, '樱花飞的'],
    [/回学校/g, '回到学校'],
    [/回到校/g, '回到学校'],
    [/回到学取/g, '回到学校取'],
    [/到校取/g, '到学校取'],
  ];
  
  for (const [pattern, replacement] of postFixPatterns) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // 修复括号不匹配
  if (cleaned.includes('）') && !cleaned.includes('（')) {
    cleaned = '（' + cleaned;
  }
  
  return cleaned.trim();
};

interface DialogueBoxProps {
  speaker: string;
  text: string;
  onNext: () => void;
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;
  isVoiceEnabled: boolean;
  toggleVoice: () => void;
  isVoiceLoading: boolean;
  isAutoPlay?: boolean;
  toggleAutoPlay?: () => void;
  opacity?: number;
}

export const DialogueBox: React.FC<DialogueBoxProps> = memo(({ 
  speaker, 
  text, 
  onNext, 
  isTyping, 
  setIsTyping,
  isVoiceEnabled,
  toggleVoice,
  isVoiceLoading,
  isAutoPlay = false,
  toggleAutoPlay,
  opacity = 90
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const { themeConfig } = useTheme();

  // 清理后的文本
  const cleanedText = useMemo(() => cleanDialogueText(text), [text]);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    const localCleanedText = cleanedText; // 捕获当前值避免闭包问题

    const timer = setInterval(() => {
      if (index < localCleanedText.length) {
        setDisplayedText((prev) => prev + localCleanedText.charAt(index));
        
        // Play typing sound
        if (index % TYPING_SOUND_INTERVAL === 0) {
             audioService.playSfx('type');
        }
        
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, TYPING_SPEED_MS);

    return () => clearInterval(timer);
  }, [cleanedText, setIsTyping]);

  // Add spacebar keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        
        // Only trigger if dialogue box is the primary interactive element
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return; // Don't trigger when user is typing in input fields
        }

        if (isTyping) {
          // Instant finish typing
          setDisplayedText(cleanedText);
          setIsTyping(false);
          audioService.playSfx('next');
        } else {
          audioService.playSfx('next');
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, cleanedText, setIsTyping, onNext]);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent clicking the voice button from triggering next dialogue
    if ((e.target as HTMLElement).closest('button')) return;

    if (isTyping) {
      // Instant finish
      setDisplayedText(cleanedText);
      setIsTyping(false);
      audioService.playSfx('next');
    } else {
      audioService.playSfx('next');
      onNext();
    }
  };

  return (
    <div 
        className="absolute bottom-0 w-full p-4 md:p-8 z-20 flex justify-center cursor-pointer"
        onClick={handleClick}
    >
      <div className="w-full max-w-4xl relative group">
        
        {/* Glowing Background/Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-xl opacity-75 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200 animate-gradient-xy"></div>
        
        <div 
          className="relative w-full rounded-xl shadow-2xl overflow-hidden min-h-[160px] flex flex-col p-6 md:p-8"
          style={{ 
            background: themeConfig.dialogueBox.background,
            border: themeConfig.dialogueBox.border,
            backdropFilter: themeConfig.dialogueBox.backdropBlur,
            opacity: opacity / 100
          }}
        >
            
            <div className="flex justify-between items-start mb-3">
                {/* Speaker Label */}
                {speaker && (
                    <div className="relative inline-block group-speaker">
                        <div className="absolute inset-0 blur-md opacity-20 rounded-full" style={{ background: themeConfig.dialogueBox.speakerText }}></div>
                        <div 
                          className="relative px-5 py-1.5 rounded-full font-bold tracking-wider text-sm shadow-sm flex items-center gap-2"
                          style={{ 
                            background: themeConfig.dialogueBox.speakerBg,
                            color: themeConfig.dialogueBox.speakerText,
                            border: `1px solid ${themeConfig.dialogueBox.speakerText}40`
                          }}
                        >
                            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: themeConfig.dialogueBox.speakerText }}></span>
                            {speaker}
                        </div>
                    </div>
                )}

                {/* Controls Group */}
                <div className="flex items-center gap-3">
                  {/* Auto Play Toggle */}
                  {toggleAutoPlay && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleAutoPlay();
                        }}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border
                            ${isAutoPlay 
                                ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                            }
                        `}
                        title="开启/关闭 自动播放"
                    >
                       <span>{isAutoPlay ? '▶ 自动' : '▷ 手动'}</span>
                    </button>
                  )}

                  {/* Voice Toggle Button */}
                  <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          toggleVoice();
                      }}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border
                        ${isVoiceEnabled 
                            ? 'bg-pink-600/20 text-pink-300 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                        }
                    `}
                    title="开启/关闭 语音朗读"
                >
                   {isVoiceLoading ? (
                       <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                   ) : (
                       <span>{isVoiceEnabled ? '🔊 语音' : '🔇 语音'}</span>
                   )}
                </button>
                </div>
            </div>

            {/* Main Text */}
            <p 
              className="text-lg md:text-xl leading-relaxed font-medium drop-shadow-md font-sans"
              style={{ color: themeConfig.dialogueBox.textColor }}
            >
                {displayedText}
                {isTyping && <span className="animate-pulse ml-1 inline-block w-2 h-5 align-middle" style={{ background: themeConfig.dialogueBox.speakerText, boxShadow: `0 0 10px ${themeConfig.dialogueBox.speakerText}` }}></span>}
            </p>

            {/* Next Indicator */}
            {!isTyping && (
                <div 
                  className="absolute bottom-4 right-6 text-2xl animate-bounce-custom"
                  style={{ color: themeConfig.dialogueBox.speakerText }}
                >
                    ▼
                </div>
            )}
        </div>
      </div>
    </div>
  );
});

DialogueBox.displayName = 'DialogueBox';