import React, { memo } from 'react';

interface ErrorOverlayProps {
  error: string | null;
  onClose: () => void;
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = memo(({ error, onClose }) => {
  if (!error) return null;
  
  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
      <div className="bg-slate-800 border border-red-500 p-6 rounded-lg max-w-md text-center">
        <h2 className="text-red-400 text-xl font-bold mb-2">错误</h2>
        <p className="text-slate-300 mb-4">{error}</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
});

ErrorOverlay.displayName = 'ErrorOverlay';
