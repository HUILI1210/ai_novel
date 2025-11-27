/**
 * Hooks 导出
 * 
 * 架构说明：
 * - useGameState: 主游戏状态 Hook（目前包含所有逻辑，计划逐步拆分）
 * - useAudioControl: 音频和语音控制
 * - useAutoPlay: 自动播放功能
 * - useDialogueQueue: AI 生成模式的对话队列管理
 * - useScriptPlayer: 预定义剧本播放控制
 * - useParallax: 视差效果
 */

export { useGameState } from './useGameState';
export { useAudioControl } from './useAudioControl';
export { useAutoPlay } from './useAutoPlay';
export { useDialogueQueue } from './useDialogueQueue';
export { useScriptPlayer } from './useScriptPlayer';
export { useParallax } from './useParallax';
