import React, { memo, useState, useEffect, useMemo } from 'react';
import { CharacterExpression } from '../types';
import { getAssetPath } from '../utils/assetPath';
import '../styles/animations.css';

// 角色图片配置 - 支持多角色
type CharacterImageSet = Record<CharacterExpression, string>;

// 获取角色图片路径的函数
const getCharacterImages = (): Record<string, CharacterImageSet> => ({
  // 雯曦 - 傲娇青梅竹马 (stories/01_tsundere_wenxi/expressions/)
  '雯曦': {
    [CharacterExpression.NEUTRAL]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png'),
    [CharacterExpression.HAPPY]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_happy.png'),
    [CharacterExpression.SAD]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_sad.png'),
    [CharacterExpression.ANGRY]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_angry.png'),
    [CharacterExpression.BLUSH]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_blush.png'),
    [CharacterExpression.SURPRISED]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png'),
    [CharacterExpression.SHY]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_blush.png'),
    [CharacterExpression.FEAR]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png'),
  },
  // 艾琳娜 - 白金蔷薇公主 (stories/02_princess_elena/expressions/)
  '艾琳娜': {
    [CharacterExpression.NEUTRAL]: getAssetPath('/stories/02_princess_elena/expressions/smiling.png'),
    [CharacterExpression.HAPPY]: getAssetPath('/stories/02_princess_elena/expressions/smiling.png'),
    [CharacterExpression.SAD]: getAssetPath('/stories/02_princess_elena/expressions/sadness.png'),
    [CharacterExpression.ANGRY]: getAssetPath('/stories/02_princess_elena/expressions/anger.png'),
    [CharacterExpression.BLUSH]: getAssetPath('/stories/02_princess_elena/expressions/blushing.png'),
    [CharacterExpression.SURPRISED]: getAssetPath('/stories/02_princess_elena/expressions/surprise.png'),
    [CharacterExpression.SHY]: getAssetPath('/stories/02_princess_elena/expressions/blushing.png'),
    [CharacterExpression.FEAR]: getAssetPath('/stories/02_princess_elena/expressions/sadness.png'),
  },
  // 柳如烟 - 古风花魁 (暂用雯曦图片作为占位)
  '柳如烟': {
    [CharacterExpression.NEUTRAL]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png'),
    [CharacterExpression.HAPPY]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_happy.png'),
    [CharacterExpression.SAD]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_sad.png'),
    [CharacterExpression.ANGRY]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_angry.png'),
    [CharacterExpression.BLUSH]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_blush.png'),
    [CharacterExpression.SURPRISED]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png'),
    [CharacterExpression.SHY]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_blush.png'),
    [CharacterExpression.FEAR]: getAssetPath('/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png'),
  }
});

// 默认使用雯曦的图片
const DEFAULT_CHARACTER = '雯曦';

interface CharacterSpriteProps {
  expression: CharacterExpression;
  isVisible: boolean;
  characterName?: string;
  isSpeaking?: boolean;
  parallaxOffset?: { x: number; y: number };
}

export const CharacterSprite: React.FC<CharacterSpriteProps> = memo(({ 
  expression, 
  isVisible, 
  characterName = '雯曦', 
  isSpeaking = false, 
  parallaxOffset = { x: 0, y: 0 } 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // 获取当前角色的图片集
  const characterImages = useMemo(() => {
    const images = getCharacterImages();
    return images[characterName] || images[DEFAULT_CHARACTER];
  }, [characterName]);
  
  const fallbackImage = characterImages[CharacterExpression.NEUTRAL];
  const [currentImage, setCurrentImage] = useState(characterImages[expression] || fallbackImage);

  // 当表情或角色变化时，切换图片
  useEffect(() => {
    setImageLoaded(false);
    const newImage = characterImages[expression] || fallbackImage;
    
    // 预加载新图片
    const img = new Image();
    img.onload = () => {
      setCurrentImage(newImage);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setCurrentImage(fallbackImage);
      setImageLoaded(true);
    };
    img.src = newImage;
  }, [expression, characterImages, fallbackImage]);

  return (
    <div 
      className={`absolute bottom-0 left-1/2 transition-all duration-500 z-10 flex justify-center items-end pointer-events-none
        ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        height: '95vh',  // 占满大部分屏幕高度
        width: '80%',    // 增加宽度
        maxWidth: '90vh',
        transform: `translateX(-50%) translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.2}px)`,
      }}
    >
      {/* 角色图片容器 */}
      <div className={`relative w-full flex items-end justify-center transition-transform duration-300 ${isSpeaking ? 'scale-[1.02]' : 'scale-100'}`}
        style={{ height: '100%' }}
      >
        {/* 主角色图片 - 放大显示 */}
        <img 
          src={currentImage} 
          alt={`${characterName} - ${expression}`}
          className={`h-full w-auto object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
            maxWidth: 'none'  // 移除宽度限制
          }}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    </div>
  );
});

CharacterSprite.displayName = 'CharacterSprite';