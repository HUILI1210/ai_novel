import React, { useEffect, useState, memo } from 'react';
import { BackgroundType } from '../types';
import { SCENE_TRANSITION_DURATION } from '../constants/config';

interface SceneTransitionProps {
  triggerKey: BackgroundType | string;
  type?: 'fade' | 'black' | 'blur' | 'slide';
}

export const SceneTransition: React.FC<SceneTransitionProps> = memo(({ triggerKey, type = 'fade' }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Trigger transition when the key (background) changes
    setIsActive(true);
    const timer = setTimeout(() => {
      setIsActive(false);
    }, SCENE_TRANSITION_DURATION);

    return () => clearTimeout(timer);
  }, [triggerKey]);

  // Render different transition types based on type prop
  const renderTransition = () => {
    switch (type) {
      case 'black':
        return (
          <div 
            className={`absolute inset-0 z-20 bg-black pointer-events-none transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
        );
      case 'blur':
        return (
          <div 
            className={`absolute inset-0 z-20 bg-white/30 backdrop-blur-sm pointer-events-none transition-all duration-700 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
        );
      case 'slide':
        return (
          <div 
            className={`absolute inset-0 z-20 bg-gradient-to-r from-black via-black/50 to-transparent pointer-events-none transition-transform duration-700 ease-in-out ${isActive ? 'translate-x-0' : '-translate-x-full'}`}
          />
        );
      case 'fade':
      default:
        return (
          <div 
            className={`absolute inset-0 z-20 bg-black/50 pointer-events-none transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
        );
    }
  };

  return renderTransition();
});

SceneTransition.displayName = 'SceneTransition';