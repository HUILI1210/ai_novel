import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// 主题类型
export type ThemeType = 'glass' | 'retro' | 'parchment' | 'neon';

// 主题配置接口
interface ThemeConfig {
  name: string;
  dialogueBox: {
    background: string;
    border: string;
    textColor: string;
    speakerBg: string;
    speakerText: string;
    backdropBlur: string;
  };
  choiceButton: {
    background: string;
    hoverBackground: string;
    border: string;
    textColor: string;
  };
}

// 主题配置
export const themes: Record<ThemeType, ThemeConfig> = {
  glass: {
    name: '现代玻璃',
    dialogueBox: {
      background: 'rgba(15, 23, 42, 0.85)',
      border: '1px solid rgba(100, 116, 139, 0.5)',
      textColor: '#f1f5f9',
      speakerBg: 'rgba(30, 41, 59, 1)',
      speakerText: '#f9a8d4',
      backdropBlur: 'blur(12px)',
    },
    choiceButton: {
      background: 'rgba(30, 41, 59, 0.9)',
      hoverBackground: 'rgba(51, 65, 85, 0.95)',
      border: '1px solid rgba(236, 72, 153, 0.3)',
      textColor: '#f1f5f9',
    },
  },
  retro: {
    name: '复古像素',
    dialogueBox: {
      background: '#1a1a2e',
      border: '4px solid #eee8d5',
      textColor: '#eee8d5',
      speakerBg: '#16213e',
      speakerText: '#ffd700',
      backdropBlur: 'none',
    },
    choiceButton: {
      background: '#16213e',
      hoverBackground: '#0f3460',
      border: '3px solid #e94560',
      textColor: '#eee8d5',
    },
  },
  parchment: {
    name: '羊皮纸',
    dialogueBox: {
      background: 'linear-gradient(135deg, #f5e6d3 0%, #e8d4b8 100%)',
      border: '3px solid #8b7355',
      textColor: '#3d2914',
      speakerBg: '#c9b896',
      speakerText: '#5c4033',
      backdropBlur: 'none',
    },
    choiceButton: {
      background: '#e8d4b8',
      hoverBackground: '#d4c4a8',
      border: '2px solid #8b7355',
      textColor: '#3d2914',
    },
  },
  neon: {
    name: '赛博霓虹',
    dialogueBox: {
      background: 'rgba(10, 10, 30, 0.95)',
      border: '2px solid #00ffff',
      textColor: '#00ffff',
      speakerBg: 'rgba(0, 255, 255, 0.1)',
      speakerText: '#ff00ff',
      backdropBlur: 'blur(8px)',
    },
    choiceButton: {
      background: 'rgba(10, 10, 30, 0.9)',
      hoverBackground: 'rgba(0, 255, 255, 0.2)',
      border: '2px solid #ff00ff',
      textColor: '#00ffff',
    },
  },
};

// 主题上下文
interface ThemeContextType {
  theme: ThemeType;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeType) => void;
  availableThemes: ThemeType[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    // 从localStorage读取保存的主题
    const saved = localStorage.getItem('ui-theme');
    return (saved as ThemeType) || 'glass';
  });

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('ui-theme', newTheme);
  }, []);

  const value: ThemeContextType = {
    theme,
    themeConfig: themes[theme],
    setTheme,
    availableThemes: Object.keys(themes) as ThemeType[],
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 使用主题的Hook
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
