/**
 * 游戏配置常量
 */

// 打字效果配置
export const TYPING_SPEED_MS = 30;
export const TYPING_SOUND_INTERVAL = 3;

// 好感度配置
export const AFFECTION_MIN = 0;
export const AFFECTION_MAX = 100;
export const AFFECTION_INITIAL = 50;
export const AFFECTION_GOOD_ENDING_THRESHOLD = 70;

// 音频配置
export const BGM_VOLUME = 0.4;
export const VOICE_VOLUME = 1.0;
export const VOICE_SAMPLE_RATE = 24000;

// 动画时长配置 (ms)
export const SCENE_TRANSITION_DURATION = 800;
export const FADE_DURATION = 1000;

// ============ AI 提供商选择 ============
// 'gemini' = Google Gemini | 'dashscope' = 阿里云 DashScope
export const AI_PROVIDER: 'gemini' | 'dashscope' = 'dashscope';

// ============ 通用配置 ============
export const AI_TEMPERATURE = 0.8;
export const IMAGE_GENERATION_ENABLED = true;   // 启用图像生成
export const TTS_ENABLED = true;                // 启用语音合成（CosyVoice WebSocket）

// ============ Google Gemini 配置 ============
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';  // Free Tier 有地区限制
export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const GEMINI_TTS_VOICE = 'Leda';

// ============ 阿里云 DashScope 配置 ============
export const DASHSCOPE_TEXT_MODEL = 'qwen-plus';
export const DASHSCOPE_IMAGE_MODEL = 'wanx-v1';             // 通义万相
export const COSY_VOICE_MODEL = 'cosyvoice-v2';           // 使用 v2 版本，更稳定
export const COSY_VOICE_NAME = 'longxiaochun_v2';         // 中文女声，温柔甜美

// 角色配置
export const CHARACTER_NAME = '爱子';
export const PLAYER_NAME = '你';
export const NARRATOR_NAME = '旁白';
