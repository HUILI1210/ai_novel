import React, { useState, useEffect, memo } from 'react';
import { audioService } from '../services/audioService';
import { TYPING_SPEED_MS, TYPING_SOUND_INTERVAL } from '../constants/config';
import '../styles/animations.css';

interface DialogueBoxProps {
  speaker: string;
  text: string;
  onNext: () => void;
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;
  isVoiceEnabled: boolean;
  toggleVoice: () => void;
  isVoiceLoading: boolean;
}

export const DialogueBox: React.FC<DialogueBoxProps> = memo(({ 
  speaker, 
  text, 
  onNext, 
  isTyping, 
  setIsTyping,
  isVoiceEnabled,
  toggleVoice,
  isVoiceLoading
}) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        
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
  }, [text, setIsTyping]);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent clicking the voice button from triggering next dialogue
    if ((e.target as HTMLElement).closest('button')) return;

    if (isTyping) {
      // Instant finish
      setDisplayedText(text);
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
        
        <div className="relative w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden min-h-[160px] flex flex-col p-6 md:p-8">
            
            <div className="flex justify-between items-start mb-3">
                {/* Speaker Label */}
                {speaker && (
                    <div className="relative inline-block group-speaker">
                        <div className="absolute inset-0 bg-pink-500 blur-md opacity-20 rounded-full"></div>
                        <div className="relative px-5 py-1.5 rounded-full bg-slate-800 border border-pink-500/50 text-pink-300 font-bold tracking-wider text-sm shadow-sm flex items-center gap-2">
                            {speaker === '爱子' && <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>}
                            {speaker}
                        </div>
                    </div>
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
                       <span>{isVoiceEnabled ? '🔊 语音开启' : '🔇 语音关闭'}</span>
                   )}
                </button>
            </div>

            {/* Main Text */}
            <p className="text-lg md:text-xl text-slate-100 leading-relaxed font-medium drop-shadow-md font-sans">
                {displayedText}
                {isTyping && <span className="animate-pulse ml-1 inline-block w-2 h-5 bg-pink-400 align-middle shadow-[0_0_10px_rgba(244,114,182,0.8)]"></span>}
            </p>

            {/* Next Indicator */}
            {!isTyping && (
                <div className="absolute bottom-4 right-6 text-pink-400 text-2xl animate-bounce-custom">
                    ▼
                </div>
            )}
        </div>
      </div>
    </div>
  );
});

DialogueBox.displayName = 'DialogueBox';