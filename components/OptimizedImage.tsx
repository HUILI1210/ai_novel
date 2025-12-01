import React, { useState, useEffect, useRef, memo } from 'react';
import { getOptimizedImagePath, imagePreloader, checkWebPSupport } from '../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;           // 是否懒加载
  priority?: boolean;       // 是否优先加载
  placeholder?: 'blur' | 'none';  // 占位效果
  objectFit?: 'cover' | 'contain' | 'fill';
}

/**
 * 优化的图片组件
 * - 支持 WebP 格式自动回退
 * - 支持懒加载 (Intersection Observer)
 * - 支持模糊占位图
 * - 支持优先加载
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  src,
  alt,
  className = '',
  style,
  onLoad,
  onError,
  lazy = true,
  priority = false,
  placeholder = 'blur',
  objectFit = 'cover',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [thumbSrc, setThumbSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 初始化图片路径
  useEffect(() => {
    const init = async () => {
      await checkWebPSupport();
      const optimizedPath = getOptimizedImagePath(src);
      const thumbPath = getOptimizedImagePath(src, true);
      setCurrentSrc(optimizedPath);
      setThumbSrc(thumbPath);

      // 优先加载的图片立即开始加载
      if (priority) {
        imagePreloader.prioritize(optimizedPath);
      }
    };
    init();
  }, [src, priority]);

  // 懒加载：Intersection Observer
  useEffect(() => {
    if (!lazy || priority) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // 提前200px开始加载
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority]);

  // 处理图片加载完成
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // 处理图片加载失败（回退到原始格式）
  const handleError = () => {
    if (currentSrc !== src) {
      // 如果 WebP 加载失败，回退到原始格式
      setCurrentSrc(src);
    } else {
      onError?.();
    }
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* 模糊占位图 */}
      {placeholder === 'blur' && !isLoaded && thumbSrc && (
        <img
          src={thumbSrc}
          alt=""
          className="absolute inset-0 w-full h-full blur-lg scale-110 transition-opacity duration-300"
          style={{ 
            objectFit,
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* 实际图片 */}
      {isInView && currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectFit }}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

/**
 * 背景图片组件 - 用于全屏背景
 */
interface BackgroundImageProps {
  src: string;
  fallbackGradient?: string;
  brightness?: number;
  parallaxOffset?: { x: number; y: number };
  className?: string;
  onLoad?: () => void;
}

export const BackgroundImage: React.FC<BackgroundImageProps> = memo(({
  src,
  fallbackGradient = '#1a1a2e',
  brightness = 1,
  parallaxOffset = { x: 0, y: 0 },
  className = '',
  onLoad,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      await checkWebPSupport();
      const optimizedPath = getOptimizedImagePath(src);
      setCurrentSrc(optimizedPath);
      
      // 预加载图片
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        onLoad?.();
      };
      img.onerror = () => {
        // 回退到原始格式
        if (optimizedPath !== src) {
          setCurrentSrc(src);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            setIsLoaded(true);
            onLoad?.();
          };
          fallbackImg.src = src;
        }
      };
      img.src = optimizedPath;
    };
    init();
  }, [src, onLoad]);

  return (
    <>
      {/* 渐变背景作为底层 */}
      <div
        className="absolute inset-0"
        style={{ background: fallbackGradient }}
      />
      
      {/* 实际背景图 */}
      <div
        className={`absolute transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{
          backgroundImage: currentSrc ? `url(${currentSrc})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `brightness(${brightness})`,
          transform: `translate(${-parallaxOffset.x}px, ${-parallaxOffset.y}px) scale(1.05)`,
          top: '-2.5%',
          left: '-2.5%',
          width: '105%',
          height: '105%',
        }}
      />
    </>
  );
});

BackgroundImage.displayName = 'BackgroundImage';
