import React, { memo, useState, useEffect } from 'react';

interface CGSceneProps {
  isVisible: boolean;
  imageUrl: string | null;
  title?: string;
  description?: string;
  onClose: () => void;
}

export const CGScene: React.FC<CGSceneProps> = memo(({
  isVisible,
  imageUrl,
  title,
  description,
  onClose
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowContent(true);
      setIsLoaded(false);
    } else {
      const timer = setTimeout(() => setShowContent(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!showContent) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'bg-black/95 opacity-100' : 'bg-black/0 opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div className={`relative max-w-4xl max-h-[90vh] transition-all duration-700 ${
        isVisible && isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* CG Image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title || 'CG Scene'}
            onLoad={() => setIsLoaded(true)}
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
          />
        )}

        {/* Loading State */}
        {!isLoaded && imageUrl && (
          <div className="w-96 h-64 bg-slate-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">加载CG中...</p>
            </div>
          </div>
        )}

        {/* Title and Description */}
        {(title || description) && isLoaded && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-lg">
            {title && (
              <h3 className="text-2xl font-bold text-amber-400 mb-2">{title}</h3>
            )}
            {description && (
              <p className="text-slate-300">{description}</p>
            )}
          </div>
        )}

        {/* Close Hint */}
        <div className="absolute top-4 right-4 text-slate-400 text-sm bg-black/50 px-3 py-1 rounded-full">
          点击任意处关闭
        </div>
      </div>
    </div>
  );
});

CGScene.displayName = 'CGScene';
