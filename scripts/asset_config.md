# 素材生成配置

## 背景图规格（必须遵守）

| 属性 | 值 |
|------|-----|
| **比例** | 16:9 |
| **尺寸** | 1920×1080 或 1280×720 |
| **格式** | PNG |

## Gemini 图像生成参数

```javascript
// 背景图生成配置
const BACKGROUND_CONFIG = {
  aspectRatio: '16:9',
  // Gemini Imagen 支持的尺寸
  width: 1920,
  height: 1080,
  format: 'png'
};

// CG图生成配置
const CG_CONFIG = {
  aspectRatio: '16:9',
  width: 1920,
  height: 1080,
  format: 'png'
};

// 角色立绘配置
const CHARACTER_CONFIG = {
  aspectRatio: '2:3',
  width: 1024,
  height: 1536,
  format: 'png',
  transparentBackground: true
};
```

## 生成提示词模板

### 背景图
```
[场景描述], anime style background, detailed environment, 
no characters, no people, high quality, 16:9 aspect ratio,
atmospheric lighting, [时间/天气描述]
```

### CG图
```
[场景描述], anime style illustration, romantic scene,
[角色描述], high quality, 16:9 aspect ratio,
cinematic composition, [光影描述]
```

## 注意事项

1. 现有背景图为 1024×1024 (1:1)，需要逐步替换
2. Gemini Imagen API 可能有尺寸限制，需要先测试
3. 如果无法直接生成 16:9，可以生成后裁剪或缩放
