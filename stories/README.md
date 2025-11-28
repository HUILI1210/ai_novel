# 📚 剧本库

本文件夹包含所有游戏剧本及其相关素材。

## 文件夹结构

```
stories/
├── README.md                      # 本文件
├── 01_tsundere_wenxi/             # 💕 傲娇青梅竹马
│   ├── script/                    # 剧本文本
│   ├── choices/                   # 选择分支数据
│   ├── reference/                 # 人物参考图
│   ├── expressions/               # 人物表情立绘
│   ├── backgrounds/               # 场景背景图
│   └── cg/                        # 特殊CG图
├── 02_princess_elena/             # 👑 高傲王国公主
│   ├── script/
│   ├── choices/
│   ├── reference/
│   ├── expressions/
│   ├── backgrounds/
│   └── cg/
└── 03_courtesan_liuruyan/         # 🌸 古风绝世花魁
    ├── script/
    ├── choices/
    ├── reference/
    ├── expressions/
    ├── backgrounds/
    └── cg/
```

## 剧本列表

| 编号 | 名称 | 角色 | 类型 | 状态 |
|------|------|------|------|------|
| 01 | 傲娇青梅竹马 | 雯曦 | 现代校园 | ✅ 完整 |
| 02 | 高傲王国公主 | 艾琳娜 | 奇幻宫廷 | ✅ 完整 |
| 03 | 古风绝世花魁 | 柳如烟 | 古风言情 | ❌ 待开发 |

## 添加新剧本

1. 创建新文件夹：`XX_story_name/`
2. 创建子文件夹：`script/`, `choices/`, `reference/`, `expressions/`, `backgrounds/`
3. 在 `script/README.md` 中记录角色设定和故事背景
4. 添加角色参考图到 `reference/`
5. 生成表情立绘到 `expressions/`
6. 生成场景背景到 `backgrounds/`
7. 在 `services/scriptLibraryService.ts` 中注册新剧本

## 素材规格

### 背景图
- **格式**: PNG
- **比例**: **16:9（必须）**
- **尺寸**: 1920×1080 或 1280×720
- **命名**: `{场景名}.png`

### 角色立绘
- **格式**: PNG（透明背景）
- **尺寸**: 建议 1024×1536 或类似比例
- **命名**: `{角色名}_{表情}.png`

### CG图
- **格式**: PNG 或 JPG
- **比例**: 16:9
- **尺寸**: 1920×1080
- **命名**: `cg{编号}.jpg`

## 注意事项

- 本文件夹位于 `public/stories/`，游戏直接从此处加载素材
- 每个剧本的素材完全独立，互不干扰
- 新增素材时直接放入对应剧本的文件夹即可
