import React, { useMemo, memo } from 'react';
import { BackgroundType } from '../types';
import '../styles/animations.css';

interface BackgroundProps {
  type: BackgroundType;
}

export const Background: React.FC<BackgroundProps> = memo(({ type }) => {
  // Mapping abstract types to Picsum images that vaguely resemble the setting
  // Using specific seeds for consistency.
  const imageUrl = useMemo(() => {
    switch (type) {
      case BackgroundType.SCHOOL_ROOFTOP:
        return 'https://picsum.photos/id/16/1920/1080'; // Sky/Open
      case BackgroundType.CLASSROOM:
        return 'https://picsum.photos/id/20/1920/1080'; // Desk/Interior
      case BackgroundType.STREET_SUNSET:
        return 'https://picsum.photos/id/348/1920/1080'; // City/Urban
      case BackgroundType.CAFE:
        return 'https://picsum.photos/id/431/1920/1080'; // Coffee/Indoor
      case BackgroundType.PARK_NIGHT:
        return 'https://picsum.photos/id/132/1920/1080'; // Nature/Dark
      case BackgroundType.BEDROOM:
        return 'https://picsum.photos/id/1060/1920/1080'; // Cozy/Interior
      default:
        return 'https://picsum.photos/id/16/1920/1080';
    }
  }, [type]);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
      <div 
        key={type} // Key change triggers animation
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out animate-fadeIn"
        style={{ backgroundImage: `url(${imageUrl})`, filter: 'brightness(0.7)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/30" />
    </div>
  );
});

Background.displayName = 'Background';
