import React, { useEffect, useState, memo } from 'react';
import { BackgroundType } from '../types';
import { SCENE_TRANSITION_DURATION } from '../constants/config';

interface SceneTransitionProps {
  triggerKey: BackgroundType | string;
}

export const SceneTransition: React.FC<SceneTransitionProps> = memo(({ triggerKey }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Trigger transition when the key (background) changes
    setIsActive(true);
    const timer = setTimeout(() => {
      setIsActive(false);
    }, SCENE_TRANSITION_DURATION);

    return () => clearTimeout(timer);
  }, [triggerKey]);

  return (
    <div 
      className={`absolute inset-0 z-10 bg-black pointer-events-none transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
    />
  );
});

SceneTransition.displayName = 'SceneTransition';