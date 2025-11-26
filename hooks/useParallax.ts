import { useState, useEffect, useCallback } from 'react';

interface ParallaxOffset {
  x: number;
  y: number;
}

interface UseParallaxOptions {
  intensity?: number;
  enabled?: boolean;
}

/**
 * 视差效果Hook
 * 根据鼠标位置计算视差偏移量
 */
export const useParallax = (options: UseParallaxOptions = {}) => {
  const { intensity = 20, enabled = true } = options;
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled) return;

    // 计算鼠标相对于屏幕中心的偏移
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // 归一化偏移量 (-1 到 1)
    const normalizedX = (e.clientX - centerX) / centerX;
    const normalizedY = (e.clientY - centerY) / centerY;
    
    // 应用强度系数
    setOffset({
      x: normalizedX * intensity,
      y: normalizedY * intensity
    });
  }, [intensity, enabled]);

  const handleMouseLeave = useCallback(() => {
    // 鼠标离开时重置偏移
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave, enabled]);

  return offset;
};
