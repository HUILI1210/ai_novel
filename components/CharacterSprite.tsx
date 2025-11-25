import React, { useMemo, memo } from 'react';
import { CharacterExpression } from '../types';
import '../styles/animations.css';

interface CharacterSpriteProps {
  expression: CharacterExpression;
  isVisible: boolean;
  imageUrl?: string | null;
}

export const CharacterSprite: React.FC<CharacterSpriteProps> = memo(({ expression, isVisible, imageUrl }) => {
  
  // Determine the animation class based on expression
  const animationClass = useMemo(() => {
    switch (expression) {
      case CharacterExpression.HAPPY:
        return 'animate-bounce-gentle';
      case CharacterExpression.ANGRY:
        return 'animate-shake-tense';
      case CharacterExpression.SURPRISED:
        return 'animate-pop-up';
      case CharacterExpression.SAD:
        return 'animate-sway-sad';
      case CharacterExpression.BLUSH:
        return 'animate-pulse-shy';
      default:
        return 'animate-breathe'; // Neutral/Default
    }
  }, [expression]);

  return (
    <div 
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 transition-all duration-700 z-10 flex justify-center items-end pointer-events-none
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        style={{ height: '90vh', width: '100%', maxWidth: '100vh' }}
    >
       {/* Character Image Container */}
       <div className={`relative h-full w-full flex items-end justify-center pointer-events-auto transition-transform duration-300 hover:scale-[1.02] hover:drop-shadow-[0_0_35px_rgba(255,255,255,0.4)] group ${animationClass}`}>
            {imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt={expression}
                    className="h-full w-auto max-w-none object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] mask-gradient"
                    style={{ 
                        maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                    }}
                />
            ) : (
                /* Fallback loading placeholder */
                isVisible && (
                    <div className="w-64 h-96 bg-white/5 rounded-t-full animate-pulse flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-[0_0_30px_rgba(236,72,153,0.2)]">
                        <span className="text-white/50 font-light tracking-widest">正在加载爱子...</span>
                    </div>
                )
            )}
            
            {/* Interaction hint (optional, subtle glow on hover) */}
            <div className="absolute inset-0 bg-pink-500/0 group-hover:bg-pink-500/10 transition-colors duration-500 mask-image-match pointer-events-none" />
       </div>
    </div>
  );
});

CharacterSprite.displayName = 'CharacterSprite';