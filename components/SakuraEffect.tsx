import React, { memo, useMemo } from 'react';
import '../styles/sakura.css';

interface SakuraEffectProps {
  petalCount?: number;
}

export const SakuraEffect: React.FC<SakuraEffectProps> = memo(({ petalCount = 30 }) => {
  const petals = useMemo(() => {
    return Array.from({ length: petalCount }, (_, i) => {
      const size = ['small', '', 'large'][Math.floor(Math.random() * 3)];
      const left = Math.random() * 100;
      const delay = Math.random() * 10;
      const duration = 8 + Math.random() * 7; // 8-15秒
      const swayDuration = 3 + Math.random() * 2;
      
      return {
        id: i,
        size,
        style: {
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
        }
      };
    });
  }, [petalCount]);

  return (
    <div className="sakura-container">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className={`sakura-petal ${petal.size}`}
          style={petal.style}
        />
      ))}
    </div>
  );
});

SakuraEffect.displayName = 'SakuraEffect';
