import React, { memo } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = memo(({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-white font-light tracking-widest animate-pulse">正在生成剧情...</span>
      </div>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';
