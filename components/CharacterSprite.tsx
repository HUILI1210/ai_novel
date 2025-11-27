import React, { memo, useState, useEffect, useMemo } from 'react';
import { CharacterExpression } from '../types';
import '../styles/animations.css';

// 角色图片配置 - 支持多角色
type CharacterImageSet = Record<CharacterExpression, string>;

const CHARACTER_IMAGES: Record<string, CharacterImageSet> = {
  // 雯曦 - 傲娇青梅竹马 (stories/01_tsundere_wenxi/expressions/)
  '雯曦': {
    [CharacterExpression.NEUTRAL]: '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
    [CharacterExpression.HAPPY]: '/stories/01_tsundere_wenxi/expressions/wenxi_happy.png',
    [CharacterExpression.SAD]: '/stories/01_tsundere_wenxi/expressions/wenxi_sad.png',
    [CharacterExpression.ANGRY]: '/stories/01_tsundere_wenxi/expressions/wenxi_angry.png',
    [CharacterExpression.BLUSH]: '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
    [CharacterExpression.SURPRISED]: '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png',
    [CharacterExpression.SHY]: '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
    [CharacterExpression.FEAR]: '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png'
  },
  // 艾琳娜 - 白金蔷薇公主 (stories/02_princess_elena/expressions/)
  '艾琳娜': {
    [CharacterExpression.NEUTRAL]: '/stories/02_princess_elena/expressions/elena_base.png',
    [CharacterExpression.HAPPY]: '/stories/02_princess_elena/expressions/smiling.png',
    [CharacterExpression.SAD]: '/stories/02_princess_elena/expressions/sadness.png',
    [CharacterExpression.ANGRY]: '/stories/02_princess_elena/expressions/anger.png',
    [CharacterExpression.BLUSH]: '/stories/02_princess_elena/expressions/blushing.png',
    [CharacterExpression.SURPRISED]: '/stories/02_princess_elena/expressions/surprise.png',
    [CharacterExpression.SHY]: '/stories/02_princess_elena/expressions/blushing.png',
    [CharacterExpression.FEAR]: '/stories/02_princess_elena/expressions/sadness.png'
  },
  // 柳如烟 - 古风花魁 (暂用雯曦图片作为占位)
  '柳如烟': {
    [CharacterExpression.NEUTRAL]: '/stories/01_tsundere_wenxi/expressions/wenxi_neutral.png',
    [CharacterExpression.HAPPY]: '/stories/01_tsundere_wenxi/expressions/wenxi_happy.png',
    [CharacterExpression.SAD]: '/stories/01_tsundere_wenxi/expressions/wenxi_sad.png',
    [CharacterExpression.ANGRY]: '/stories/01_tsundere_wenxi/expressions/wenxi_angry.png',
    [CharacterExpression.BLUSH]: '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
    [CharacterExpression.SURPRISED]: '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png',
    [CharacterExpression.SHY]: '/stories/01_tsundere_wenxi/expressions/wenxi_blush.png',
    [CharacterExpression.FEAR]: '/stories/01_tsundere_wenxi/expressions/wenxi_surprised.png'
  }
};

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
    return CHARACTER_IMAGES[characterName] || CHARACTER_IMAGES[DEFAULT_CHARACTER];
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
        height: '75vh',  // 显示区域高度
        width: '100%', 
        maxWidth: '60vh',
        transform: `translateX(-50%) translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.2}px)`,
        overflow: 'hidden'  // 裁剪超出部分
      }}
    >
      {/* 角色图片容器 - 显示2/3身体 */}
      <div className={`relative w-full flex items-start justify-center transition-transform duration-300 ${isSpeaking ? 'scale-[1.02]' : 'scale-100'}`}
        style={{ height: '115%' }}  // 图片实际高度比容器大，底部被裁剪
      >
        {/* 主角色图片 - 直接切换，无滤镜 */}
        <img 
          src={currentImage} 
          alt={`${characterName} - ${expression}`}
          className={`h-full w-auto max-w-none object-cover object-top transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))'
          }}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    </div>
  );
});

CharacterSprite.displayName = 'CharacterSprite';