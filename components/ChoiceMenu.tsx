import React, { memo } from 'react';
import { GameChoice } from '../types';
import { audioService } from '../services/audioService';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/animations.css';

interface ChoiceMenuProps {
  choices: GameChoice[];
  onChoose: (choice: string) => void;
  visible: boolean;
}

export const ChoiceMenu: React.FC<ChoiceMenuProps> = memo(({ choices, onChoose, visible }) => {
  const { themeConfig } = useTheme();
  
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fadeIn">
      <h3 className="text-white text-3xl mb-10 font-thin tracking-[0.3em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] border-b border-white/20 pb-4 px-12">
          做出选择
      </h3>
      
      <div className="flex flex-col gap-6 w-full max-w-xl">
        {choices.map((choice) => (
          <button
            key={choice.text}
            onMouseEnter={() => audioService.playSfx('hover')}
            onClick={(e) => {
                e.stopPropagation();
                audioService.playSfx('click');
                onChoose(choice.text);
            }}
            className="group relative px-8 py-5 text-lg rounded-xl
                       overflow-hidden transition-all duration-300 ease-out 
                       hover:scale-105 animate-slideIn"
            style={{
              background: themeConfig.choiceButton.background,
              border: themeConfig.choiceButton.border,
              color: themeConfig.choiceButton.textColor
            }}
          >
            {/* Hover Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-900/0 via-pink-900/40 to-purple-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] ease-in-out" style={{ transitionDuration: '1s' }}></div>
            
            {/* Active Highlight Line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center"></div>

            <div className="relative z-10 flex items-center justify-between w-full">
                <span className="font-medium tracking-wide group-hover:text-white transition-colors">{choice.text}</span>
                <span className="opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 text-pink-400">
                    ➜
                </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

ChoiceMenu.displayName = 'ChoiceMenu';