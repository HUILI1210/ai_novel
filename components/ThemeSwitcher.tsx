import React, { memo } from 'react';
import { useTheme, themes, ThemeType } from '../contexts/ThemeContext';

export const ThemeSwitcher: React.FC = memo(() => {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="flex flex-col gap-3">
      <label className="text-white/80 text-sm font-medium">🎨 UI主题</label>
      <div className="grid grid-cols-2 gap-2">
        {availableThemes.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              theme === t 
                ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-slate-900' 
                : 'hover:bg-white/10'
            }`}
            style={{
              background: themes[t].dialogueBox.background,
              border: themes[t].dialogueBox.border,
              color: themes[t].dialogueBox.textColor,
            }}
          >
            {themes[t].name}
          </button>
        ))}
      </div>
    </div>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';
