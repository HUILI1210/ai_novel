import React, { useEffect, useRef, memo } from 'react';

export type WeatherType = 'none' | 'rain' | 'snow' | 'leaves' | 'petals' | 'fireflies';

interface WeatherEffectProps {
  type: WeatherType;
  intensity?: number; // 0-1
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  angle?: number;
  drift?: number;
}

export const WeatherEffect: React.FC<WeatherEffectProps> = memo(({ type, intensity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (type === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas大小
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 初始化粒子
    const particleCount = Math.floor(50 * intensity);
    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(canvas.width, canvas.height, type));
    }

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        updateParticle(particle, canvas.width, canvas.height, type);
        drawParticle(ctx, particle, type);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [type, intensity]);

  if (type === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-15 pointer-events-none"
      style={{ mixBlendMode: type === 'fireflies' ? 'screen' : 'normal' }}
    />
  );
});

WeatherEffect.displayName = 'WeatherEffect';

// 创建粒子
function createParticle(width: number, height: number, type: WeatherType): Particle {
  const base: Particle = {
    x: Math.random() * width,
    y: Math.random() * height - height,
    speed: 1 + Math.random() * 2,
    size: 2 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.5,
    angle: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.5
  };

  switch (type) {
    case 'rain':
      base.speed = 8 + Math.random() * 4;
      base.size = 1;
      base.opacity = 0.3 + Math.random() * 0.3;
      break;
    case 'snow':
      base.speed = 0.5 + Math.random() * 1.5;
      base.size = 2 + Math.random() * 4;
      base.drift = (Math.random() - 0.5) * 1;
      break;
    case 'leaves':
      base.speed = 1 + Math.random() * 2;
      base.size = 8 + Math.random() * 8;
      base.drift = (Math.random() - 0.5) * 2;
      break;
    case 'petals':
      base.speed = 0.8 + Math.random() * 1.2;
      base.size = 4 + Math.random() * 4;
      base.drift = (Math.random() - 0.5) * 1.5;
      break;
    case 'fireflies':
      base.speed = 0.2 + Math.random() * 0.3;
      base.size = 2 + Math.random() * 2;
      base.opacity = Math.random();
      break;
  }

  return base;
}

// 更新粒子位置
function updateParticle(particle: Particle, width: number, height: number, type: WeatherType) {
  switch (type) {
    case 'rain':
      particle.y += particle.speed;
      particle.x += 1; // 略微倾斜
      break;
    case 'snow':
    case 'leaves':
    case 'petals':
      particle.y += particle.speed;
      particle.x += Math.sin(particle.angle || 0) * (particle.drift || 0);
      particle.angle = (particle.angle || 0) + 0.02;
      break;
    case 'fireflies':
      particle.x += Math.sin(particle.angle || 0) * 0.5;
      particle.y += Math.cos(particle.angle || 0) * 0.3;
      particle.angle = (particle.angle || 0) + 0.02;
      particle.opacity = 0.3 + Math.sin(particle.angle * 3) * 0.4;
      break;
  }

  // 重置出界粒子
  if (particle.y > height + 20) {
    particle.y = -20;
    particle.x = Math.random() * width;
  }
  if (particle.x < -20) particle.x = width + 20;
  if (particle.x > width + 20) particle.x = -20;
}

// 绘制粒子
function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle, type: WeatherType) {
  ctx.save();
  ctx.globalAlpha = particle.opacity;

  switch (type) {
    case 'rain':
      ctx.strokeStyle = '#a0c4ff';
      ctx.lineWidth = particle.size;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x + 1, particle.y + 15);
      ctx.stroke();
      break;

    case 'snow':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'leaves':
      ctx.fillStyle = '#d4a574';
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size, particle.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'petals':
      ctx.fillStyle = '#ffb7c5';
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size, particle.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'fireflies':
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      gradient.addColorStop(0, `rgba(255, 255, 150, ${particle.opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 150, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}
