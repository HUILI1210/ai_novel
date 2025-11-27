import React, { memo, useState } from 'react';

interface CGOverlayProps {
  cgImage: string | null;
  isVisible: boolean;
  onClose?: () => void;
}

export const CGOverlay: React.FC<CGOverlayProps> = memo(({ cgImage, isVisible, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!isVisible || !cgImage) return null;

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 transition-opacity duration-500"
      onClick={onClose}
    >
      {/* CG图片 */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <img
          src={cgImage}
          alt="CG"
          className={`max-w-full max-h-full object-contain transition-all duration-700 
            ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          onLoad={() => setImageLoaded(true)}
          style={{
            boxShadow: '0 0 60px rgba(255,255,255,0.1)',
          }}
        />
        
        {/* 加载中提示 */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full" />
          </div>
        )}
      </div>

      {/* 点击提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-pulse">
        点击任意位置继续
      </div>
    </div>
  );
});

CGOverlay.displayName = 'CGOverlay';
