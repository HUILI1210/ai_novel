import React, { useMemo, memo, useState } from 'react';
import { BackgroundType } from '../types';
import { getAssetPath } from '../utils/assetPath';
import '../styles/animations.css';

interface BackgroundProps {
  type: BackgroundType;
  parallaxOffset?: { x: number; y: number };
  cgImage?: string;  // CG图片路径，如果提供则替换背景
}

// 场景背景配置 - 使用本地生成的背景图片
const SCENE_BACKGROUNDS: Record<BackgroundType, {
  imageUrl: string;
  fallbackGradient: string;
  overlay?: string;
  particles?: 'sakura' | 'stars' | 'dust';
  brightness?: number;
}> = {
  [BackgroundType.SCHOOL_ROOFTOP]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/school_rooftop.png',
    fallbackGradient: 'linear-gradient(to bottom, #ff7e5f 0%, #feb47b 30%, #ffcda5 50%, #87CEEB 70%, #4a90a4 100%)',
    overlay: 'linear-gradient(to bottom, rgba(255,100,50,0.1) 0%, transparent 50%)',
    particles: 'sakura',
    brightness: 0.9
  },
  [BackgroundType.CLASSROOM]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/classroom.png',
    fallbackGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ee9ca7 100%)',
    overlay: 'linear-gradient(to right, rgba(255,200,100,0.1) 0%, transparent 50%)',
    particles: 'dust',
    brightness: 0.9
  },
  [BackgroundType.SCHOOL_GATE]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/school_gate.png',
    fallbackGradient: 'linear-gradient(to bottom, #87CEEB 0%, #98D8C8 50%, #F7DC6F 100%)',
    particles: 'sakura',
    brightness: 0.9
  },
  [BackgroundType.SCHOOL_CORRIDOR]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/school_corridor.png',
    fallbackGradient: 'linear-gradient(135deg, #E8E8E8 0%, #F5F5DC 50%, #FFEFD5 100%)',
    particles: 'dust',
    brightness: 0.9
  },
  [BackgroundType.LIBRARY]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/library.png',
    fallbackGradient: 'linear-gradient(to bottom, #8B4513 0%, #A0522D 50%, #D2691E 100%)',
    brightness: 0.85
  },
  [BackgroundType.STREET_SUNSET]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/street_sunset.png',
    fallbackGradient: 'linear-gradient(to bottom, #ff6b6b 0%, #feca57 30%, #ff9ff3 60%, #54a0ff 100%)',
    overlay: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 50%)',
    particles: 'sakura',
    brightness: 0.9
  },
  [BackgroundType.RIVERSIDE]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/riverside.png',
    fallbackGradient: 'linear-gradient(to bottom, #FFB6C1 0%, #87CEEB 50%, #98D8C8 100%)',
    particles: 'sakura',
    brightness: 0.9
  },
  [BackgroundType.CONVENIENCE_STORE]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/convenience_store.png',
    fallbackGradient: 'linear-gradient(to bottom, #FFFFFF 0%, #F0F0F0 50%, #E0E0E0 100%)',
    brightness: 0.9
  },
  [BackgroundType.CAFE]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/cafe.png',
    fallbackGradient: 'linear-gradient(to bottom right, #3d2914 0%, #5d4037 30%, #6d4c41 60%, #4e342e 100%)',
    overlay: 'radial-gradient(circle at 30% 40%, rgba(255,180,100,0.15) 0%, transparent 60%)',
    brightness: 0.85
  },
  [BackgroundType.PARK_NIGHT]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/park_night.png',
    fallbackGradient: 'linear-gradient(to bottom, #0c1445 0%, #1a237e 30%, #283593 60%, #1a1a2e 100%)',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(100,150,255,0.1) 0%, transparent 50%)',
    particles: 'stars',
    brightness: 0.8
  },
  [BackgroundType.TRAIN_STATION]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/train_station.png',
    fallbackGradient: 'linear-gradient(to bottom, #FF6347 0%, #FFA500 30%, #4682B4 70%, #2F4F4F 100%)',
    brightness: 0.9
  },
  [BackgroundType.BEDROOM]: {
    imageUrl: '/stories/01_tsundere_wenxi/backgrounds/bedroom.png',
    fallbackGradient: 'linear-gradient(to bottom, #FFB6C1 0%, #FFC0CB 30%, #FFE4E1 60%, #FFFAF0 100%)',
    overlay: 'radial-gradient(circle at 20% 50%, rgba(255,150,80,0.1) 0%, transparent 50%)',
    brightness: 0.85
  },
  // 奇幻王国场景
  [BackgroundType.PALACE_HALL]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/palace_hall.png',
    fallbackGradient: 'linear-gradient(to bottom, #DAA520 0%, #FFD700 30%, #FFF8DC 60%, #FFFFF0 100%)',
    overlay: 'radial-gradient(circle at 50% 30%, rgba(255,215,0,0.15) 0%, transparent 60%)',
    brightness: 0.9
  },
  [BackgroundType.PALACE_GARDEN]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/palace_garden.png',
    fallbackGradient: 'linear-gradient(to bottom, #191970 0%, #483D8B 30%, #6A5ACD 60%, #9370DB 100%)',
    overlay: 'radial-gradient(circle at 50% 50%, rgba(200,200,255,0.1) 0%, transparent 50%)',
    particles: 'stars',
    brightness: 0.8
  },
  [BackgroundType.PALACE_BALCONY]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/palace_balcony.png',
    fallbackGradient: 'linear-gradient(to bottom, #FF6347 0%, #FFA500 30%, #FFD700 60%, #87CEEB 100%)',
    particles: 'sakura',
    brightness: 0.9
  },
  [BackgroundType.CASTLE_CORRIDOR]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/castle_corridor.png',
    fallbackGradient: 'linear-gradient(to bottom, #2F4F4F 0%, #696969 30%, #808080 60%, #A9A9A9 100%)',
    brightness: 0.75
  },
  [BackgroundType.ROYAL_BEDROOM]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/royal_bedroom.png',
    fallbackGradient: 'linear-gradient(to bottom, #8B0000 0%, #DC143C 30%, #FF69B4 60%, #FFB6C1 100%)',
    overlay: 'radial-gradient(circle at 30% 40%, rgba(255,200,150,0.15) 0%, transparent 50%)',
    brightness: 0.8
  },
  [BackgroundType.TRAINING_GROUND]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/training_ground.png',
    fallbackGradient: 'linear-gradient(to bottom, #87CEEB 0%, #ADD8E6 30%, #F0E68C 60%, #DEB887 100%)',
    brightness: 0.9
  },
  [BackgroundType.ABANDONED_GARDEN]: {
    imageUrl: '/stories/02_princess_elena/backgrounds/abandoned_garden.png',
    fallbackGradient: 'linear-gradient(to bottom, #2F4F4F 0%, #556B2F 30%, #8B8682 60%, #696969 100%)',
    overlay: 'radial-gradient(circle at 50% 50%, rgba(100,150,100,0.1) 0%, transparent 50%)',
    particles: 'dust',
    brightness: 0.7
  }
};

// 生成粒子位置（只在首次渲染时计算）
const generateParticles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5
  }));
};

const particles = generateParticles(15);

export const Background: React.FC<BackgroundProps> = memo(({ type, parallaxOffset = { x: 0, y: 0 }, cgImage }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cgLoaded, setCgLoaded] = useState(false);

  const scene = useMemo(() => {
    const baseScene = SCENE_BACKGROUNDS[type] || SCENE_BACKGROUNDS[BackgroundType.SCHOOL_ROOFTOP];
    return {
      ...baseScene,
      imageUrl: getAssetPath(baseScene.imageUrl)
    };
  }, [type]);

  // 是否处于CG显示模式
  const isCGMode = !!cgImage;

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      {/* 备用渐变背景（始终显示作为基底） */}
      <div 
        className="absolute inset-0"
        style={{ background: isCGMode ? '#000' : scene.fallbackGradient }}
      />
      
      {/* CG模式 - 全屏显示CG图片 */}
      {isCGMode && (
        <>
          <div 
            key={cgImage}
            className={`absolute inset-0 transition-opacity duration-500 ${cgLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ 
              backgroundImage: `url(${cgImage})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#000'
            }}
          />
          <img 
            src={cgImage}
            alt="CG"
            className="hidden"
            onLoad={() => setCgLoaded(true)}
          />
        </>
      )}
      
      {/* 普通背景模式 */}
      {!isCGMode && !imageError && (
        <div 
          key={type}
          className={`absolute transition-all duration-1000 ease-in-out ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            backgroundImage: `url(${scene.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: `brightness(${scene.brightness || 0.8})`,
            transform: `translate(${-parallaxOffset.x}px, ${-parallaxOffset.y}px) scale(1.05)`,
            top: '-2.5%',
            left: '-2.5%',
            width: '105%',
            height: '105%'
          }}
        />
      )}
      
      {/* 隐藏的图片加载器 */}
      {!isCGMode && (
        <img 
          src={scene.imageUrl}
          alt=""
          className="hidden"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      
      {/* 叠加层效果 - CG模式下不显示 */}
      {!isCGMode && scene.overlay && (
        <div 
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ background: scene.overlay }}
        />
      )}
      
      {/* 粒子效果 - CG模式下不显示 */}
      {!isCGMode && scene.particles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <div
              key={p.id}
              className={`absolute rounded-full animate-float ${
                scene.particles === 'sakura' ? 'w-2 h-2' :
                scene.particles === 'stars' ? 'w-1 h-1' : 'w-1 h-1'
              }`}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                background: scene.particles === 'stars' 
                  ? 'rgba(255,255,255,0.9)' 
                  : scene.particles === 'sakura'
                  ? 'rgba(255, 182, 193, 0.8)'
                  : 'rgba(255,255,200,0.5)',
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                filter: scene.particles === 'stars' ? 'blur(0px)' : 'blur(0.5px)',
                boxShadow: scene.particles === 'stars' 
                  ? '0 0 4px rgba(255,255,255,0.9)' 
                  : scene.particles === 'sakura'
                  ? '0 0 3px rgba(255, 182, 193, 0.6)'
                  : 'none'
              }}
            />
          ))}
        </div>
      )}
      
      {/* 底部渐变遮罩 - CG模式下不显示 */}
      {!isCGMode && (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-slate-900/20" />
      )}
    </div>
  );
});

Background.displayName = 'Background';
