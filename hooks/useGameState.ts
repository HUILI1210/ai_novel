/**
 * useGameState - 主游戏状态管理 Hook
 * 
 * 架构说明：
 * 此 Hook 目前包含所有游戏逻辑，已拆分出以下独立 Hooks 供未来重构使用：
 * - useAudioControl: 音频和语音控制
 * - useAutoPlay: 自动播放功能  
 * - useDialogueQueue: AI 生成模式的对话队列管理
 * - useScriptPlayer: 预定义剧本播放控制
 * 
 * 重构计划：逐步将此 Hook 的功能迁移到上述子 Hooks，
 * 最终此文件只负责组合和协调各子 Hook。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  startNewGame, 
  makeChoice, 
  generateSpeech, 
  setCustomScript, 
  resetToDefaultScript, 
  generatePlotFramework,
  startNewGameBatch,
  generateBranchDialogue,
  resetBatchHistory,
  cleanBatchDialogueData
} from '../services/aiService';
import { GameState, SceneData, ScriptTemplate, DialogueNode, BatchSceneData, CharacterExpression, BackgroundType, BgmMood, GameChoice } from '../types';
import { audioService } from '../services/audioService';
import { AFFECTION_MIN, AFFECTION_MAX, AFFECTION_INITIAL, AI_PROVIDER } from '../constants/config';
import { saveRecord, determineEndingType } from '../services/gameRecordService';
import { DialogueCacheService } from '../services/dialogueCacheService';
import { 
  loadScript, 
  getChapterScenes, 
  getChoiceAffection,
  isEndingChapter,
  getEnding,
  FullScript 
} from '../services/scriptPlayerService';

const INITIAL_STATE: GameState = {
  currentScene: null,
  history: [],
  affection: AFFECTION_INITIAL,
  isLoading: false,
  gameStarted: false,
  turn: 0,
  isPaused: false,
  dialogueOpacity: 90,
  prefetchedScene: null,
  prefetchedImage: null,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showChoices, setShowChoices] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
    const [currentScript, setCurrentScript] = useState<ScriptTemplate | null>(null);
  
  // 本地对话队列管理 (替代 StoryBufferService)
  const [dialogueQueue, setDialogueQueue] = useState<DialogueNode[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [currentBatchChoices, setCurrentBatchChoices] = useState<GameChoice[]>([]);
  const [currentBatchBackground, setCurrentBatchBackground] = useState<BackgroundType>(BackgroundType.SCHOOL_ROOFTOP);
  const [currentBatchBgm, setCurrentBatchBgm] = useState<BgmMood>(BgmMood.DAILY);
  
  // 预定义剧本播放状态
  const [isScriptMode, setIsScriptMode] = useState(false);
  const [loadedScript, setLoadedScript] = useState<FullScript | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [scriptDialogueIndex, setScriptDialogueIndex] = useState(0);
  const [currentCG, setCurrentCG] = useState<string | null>(null);
  const [scriptScenes, setScriptScenes] = useState<SceneData[]>([]);

  // 检查是否有可用的 API Key
  const hasApiKey = AI_PROVIDER === 'openrouter' 
    // @ts-ignore - Vite injects env vars via import.meta.env
    ? !!import.meta.env?.VITE_OPENROUTER_API_KEY
    : !!process.env.GEMINI_API_KEY;

  // Audio Sync Effect
  useEffect(() => {
    if (gameState.currentScene?.bgm) {
      audioService.playBgm(gameState.currentScene.bgm);
    }
  }, [gameState.currentScene?.bgm]);

  // Voice Generation Effect
  useEffect(() => {
    const playVoiceLine = async () => {
      if (!isVoiceEnabled || !gameState.currentScene) return;
      
      // Only voice Aiko
      if (gameState.currentScene.speaker !== '雯曦' && gameState.currentScene.speaker !== currentScript?.character.name) return;

      setIsVoiceLoading(true);
      try {
        const audioBase64 = await generateSpeech(gameState.currentScene.dialogue);
        if (audioBase64) {
          audioService.playVoice(audioBase64);
        }
      } catch (e) {
        console.error("Voice playback error", e);
      } finally {
        setIsVoiceLoading(false);
      }
    };
    
    playVoiceLine();
  }, [gameState.currentScene, isVoiceEnabled, currentScript]);

  // 辅助函数：将 DialogueNode 转换为 SceneData
  const dialogueNodeToSceneData = useCallback((
    node: DialogueNode, 
    choices: GameChoice[],
    defaultBg: BackgroundType,
    defaultBgm: BgmMood
  ): SceneData => {
    return {
      narrative: node.narrative || '',
      speaker: node.speaker,
      dialogue: node.dialogue,
      expression: node.expression,
      background: node.background || defaultBg,
      bgm: node.bgm || defaultBgm,
      choices: choices,
      affectionChange: 0,
      isGameOver: false
    };
  }, []);

  // 处理游戏开始
  const handleStartGame = useCallback(async () => {
    if (!hasApiKey) {
      setError("环境变量中缺失 API_KEY。");
      return;
    }

    await audioService.init();
    audioService.playSfx('start');

    setGameState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    
    try {
      // 检查是否有缓存的第一个预设剧本数据
      const dialogueCache = DialogueCacheService.getInstance();
      let batchData: BatchSceneData;
      
      if (dialogueCache.hasCachedBatchData('preset_tsundere')) {
        console.log('[Game] 使用缓存的初始对话序列');
        batchData = cleanBatchDialogueData(dialogueCache.getCachedBatchData('preset_tsundere')!);
      } else {
        console.log('[Game] 开始生成初始对话序列...');
        batchData = await startNewGameBatch();
      }
      
      console.log(`[Game] 获取了 ${batchData.dialogueSequence.length} 轮对话`);
      
      // 初始化队列状态
      setDialogueQueue(batchData.dialogueSequence);
      setQueueIndex(0);
      setCurrentBatchChoices(batchData.choices);
      setCurrentBatchBackground(batchData.background);
      setCurrentBatchBgm(batchData.bgm);
      
      // 显示第一句
      if (batchData.dialogueSequence.length > 0) {
        const firstNode = batchData.dialogueSequence[0];
        const firstScene = dialogueNodeToSceneData(
          firstNode, 
          batchData.choices, 
          batchData.background, 
          batchData.bgm
        );
        
        setGameState(prev => ({
          ...prev,
          currentScene: firstScene,
          history: [firstScene],
          affection: AFFECTION_INITIAL,
          isLoading: false,
          gameStarted: true,
          turn: 1,
        }));
      } else {
        throw new Error("生成的对话序列为空");
      }
      
    } catch (err) {
      console.error('[Game] 游戏启动失败:', err);
      setError("游戏启动失败，请重试。");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, [hasApiKey, dialogueNodeToSceneData]);

  // 处理预定义剧本游戏开始
  const handleStartScriptGame = useCallback(async (scriptId: string) => {
    await audioService.init();
    audioService.playSfx('start');
    
    setGameState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    
    try {
      // 加载预定义剧本
      const script = await loadScript(scriptId);
      if (!script) {
        throw new Error(`无法加载剧本: ${scriptId}`);
      }
      
      console.log(`[Script] 加载剧本: ${script.title}, ${script.chapters.length} 章`);
      
      // 获取第一章的场景数据
      const scenes = getChapterScenes(script, 0, scriptId);
      if (scenes.length === 0) {
        throw new Error("剧本第一章没有对话");
      }
      
      // 初始化剧本播放状态
      setLoadedScript(script);
      setIsScriptMode(true);
      setCurrentChapterIndex(0);
      setScriptDialogueIndex(0);
      setScriptScenes(scenes);
      
      // 检查第一个场景是否是CG
      const firstScene = scenes[0] as SceneData & { cgImage?: string; isCG?: boolean };
      if (firstScene.isCG && firstScene.cgImage) {
        setCurrentCG(firstScene.cgImage);
      } else {
        setCurrentCG(null);
      }
      
      // 设置游戏状态
      setGameState(prev => ({
        ...prev,
        currentScene: firstScene,
        history: [firstScene],
        affection: AFFECTION_INITIAL,
        isLoading: false,
        gameStarted: true,
        turn: 1,
      }));
      
    } catch (err) {
      console.error('[Script] 剧本启动失败:', err);
      setError(`剧本加载失败: ${err}`);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // 处理玩家选择
  const handleChoice = useCallback(async (choiceText: string) => {
    setShowChoices(false);
    
    // 剧本模式：使用剧本选择逻辑
    if (isScriptMode && loadedScript) {
      const choiceIndex = gameState.currentScene?.choices.findIndex(c => c.text === choiceText) ?? 0;
      
      // 获取好感度变化
      const affectionChange = getChoiceAffection(loadedScript, currentChapterIndex, choiceIndex);
      
      // 检查是否有下一章
      const nextChapterIndex = currentChapterIndex + 1;
      
      if (nextChapterIndex < loadedScript.chapters.length) {
        // 进入下一章
        const nextScenes = getChapterScenes(loadedScript, nextChapterIndex, loadedScript.id);
        
        setCurrentChapterIndex(nextChapterIndex);
        setScriptDialogueIndex(0);
        setScriptScenes(nextScenes);
        
        const firstScene = nextScenes[0] as SceneData & { cgImage?: string; isCG?: boolean };
        if (firstScene.isCG && firstScene.cgImage) {
          setCurrentCG(firstScene.cgImage);
        } else {
          setCurrentCG(null);
        }
        
        setGameState(prev => ({
          ...prev,
          currentScene: firstScene,
          history: [...prev.history, firstScene],
          affection: Math.min(AFFECTION_MAX, Math.max(AFFECTION_MIN, prev.affection + affectionChange)),
          turn: prev.turn + 1,
        }));
        
        // 检查是否是结局章节
        if (isEndingChapter(loadedScript, nextChapterIndex)) {
          const ending = getEnding(loadedScript, nextChapterIndex);
          console.log('[Script] 达成结局:', ending?.title);
        }
      } else {
        // 所有章节完成，游戏结束
        console.log('[Script] 剧本播放完成');
        
        // 创建结局场景
        const gameOverScene: SceneData = {
          narrative: '故事在此画上了句点...',
          speaker: '旁白',
          dialogue: '感谢您的游玩。',
          expression: CharacterExpression.NEUTRAL,
          background: gameState.currentScene?.background || BackgroundType.SCHOOL_ROOFTOP,
          bgm: BgmMood.ROMANTIC,
          choices: [],
          affectionChange: 0,
          isGameOver: true
        };
        
        setGameState(prev => ({
          ...prev,
          currentScene: gameOverScene,
          history: [...prev.history, gameOverScene],
        }));
      }
      return;
    }
    
    // AI生成模式
    setGameState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const choice = gameState.currentScene?.choices.find(c => c.text === choiceText);
      const sentiment = choice?.sentiment || 'neutral';
      
      console.log(`[Game] 玩家选择: "${choiceText}" (${sentiment})，开始生成下一段...`);
      
      // 实时生成下一大段剧情
      const branchData = await generateBranchDialogue(choiceText, sentiment);
      const cleanedData = cleanBatchDialogueData(branchData);
      
      console.log(`[Game] 生成完成，包含 ${cleanedData.dialogueSequence.length} 轮对话`);
      
      // 更新队列状态
      setDialogueQueue(cleanedData.dialogueSequence);
      setQueueIndex(0);
      setCurrentBatchChoices(cleanedData.choices);
      setCurrentBatchBackground(cleanedData.background);
      setCurrentBatchBgm(cleanedData.bgm);
      
      // 显示新片段的第一句
      if (cleanedData.dialogueSequence.length > 0) {
        const firstNode = cleanedData.dialogueSequence[0];
        const newScene = dialogueNodeToSceneData(
          firstNode, 
          cleanedData.choices, 
          cleanedData.background, 
          cleanedData.bgm
        );
        
        // 应用好感度变化
        setGameState(prev => {
          const newAffection = Math.min(
            AFFECTION_MAX, 
            Math.max(AFFECTION_MIN, prev.affection + (cleanedData.affectionChange || 0))
          );
          return {
            ...prev,
            currentScene: newScene,
            history: [...prev.history, newScene],
            affection: newAffection,
            isLoading: false,
            turn: prev.turn + 1
          };
        });
      } else {
        // 如果生成的序列为空（可能是直接结局），显示选项或结束
        if (cleanedData.isGameOver) {
          // 直接设置游戏结束场景
          const gameOverScene: SceneData = {
            narrative: cleanedData.narrative || '故事结束了...',
            speaker: '旁白',
            dialogue: cleanedData.dialogueSequence?.[0]?.dialogue || '感谢您的游玩。',
            expression: CharacterExpression.NEUTRAL,
            background: currentBatchBackground as BackgroundType,
            bgm: BgmMood.SAD,
            choices: [],
            affectionChange: cleanedData.affectionChange || 0,
            isGameOver: true
          };
          setGameState(prev => ({
            ...prev,
            currentScene: gameOverScene,
            history: [...prev.history, gameOverScene],
            isLoading: false
          }));
        } else {
           setShowChoices(true);
           setGameState(prev => ({ ...prev, isLoading: false }));
        }
      }
      
    } catch (err) {
      console.error('[Game] 加载下一幕失败:', err);
      setError("加载下一幕失败。");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, [gameState.currentScene?.choices, dialogueNodeToSceneData]);

  const handleToggleMute = useCallback(() => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  }, []);

  // 处理下一句对话
  const handleNextDialogue = useCallback(() => {
    if (gameState.isLoading) return;
    if (showChoices) return;
    if (gameState.currentScene?.isGameOver) return;

    // 剧本模式：使用剧本推进逻辑
    if (isScriptMode && loadedScript) {
      const nextIndex = scriptDialogueIndex + 1;
      
      if (nextIndex < scriptScenes.length) {
        const nextScene = scriptScenes[nextIndex] as SceneData & { cgImage?: string; isCG?: boolean };
        setScriptDialogueIndex(nextIndex);
        
        // 更新CG状态
        if (nextScene.isCG && nextScene.cgImage) {
          setCurrentCG(nextScene.cgImage);
        } else {
          setCurrentCG(null);
        }
        
        // 检查是否是最后一句对话（显示选择）
        const isLastDialogue = nextIndex === scriptScenes.length - 1;
        if (isLastDialogue && nextScene.choices && nextScene.choices.length > 0) {
          setShowChoices(true);
        }
        
        setGameState(prev => ({
          ...prev,
          currentScene: nextScene,
          history: [...prev.history, nextScene],
          turn: prev.turn + 1,
        }));
      }
      return;
    }

    // AI生成模式：使用队列逻辑
    const nextIndex = queueIndex + 1;
    
    // 检查队列是否还有剩余对话
    if (nextIndex < dialogueQueue.length) {
      // 显示下一句
      setQueueIndex(nextIndex);
      const nextNode = dialogueQueue[nextIndex];
      
      console.log(`[Game] 显示对话 ${nextIndex + 1}/${dialogueQueue.length}: ${nextNode.speaker}`);
      
      const nextScene = dialogueNodeToSceneData(
        nextNode,
        currentBatchChoices,
        currentBatchBackground,
        currentBatchBgm
      );
      
      setGameState(prev => ({
        ...prev,
        currentScene: nextScene,
        history: [...prev.history, nextScene]
      }));
    } else {
      // 队列播放完毕，显示选项
      console.log('[Game] 对话序列结束，显示选项');
      setShowChoices(true);
    }
  }, [gameState.isLoading, showChoices, gameState.currentScene?.isGameOver, queueIndex, dialogueQueue, currentBatchChoices, currentBatchBackground, currentBatchBgm, dialogueNodeToSceneData, isScriptMode, loadedScript, scriptDialogueIndex, scriptScenes]);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(prev => !prev);
  }, []);

  // 保持最新的 handleNextDialogue 引用
  const handleNextRef = useRef(handleNextDialogue);
  useEffect(() => {
    handleNextRef.current = handleNextDialogue;
  }, [handleNextDialogue]);

  // Auto Play Effect
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // 只有在非打字状态、非加载状态、非选择状态、非暂停状态且游戏未结束时才自动播放
    if (isAutoPlay && !isTyping && !gameState.isLoading && !showChoices && !gameState.isPaused && !gameState.currentScene?.isGameOver) {
      // 计算延迟：根据文本长度动态调整
      // 基础延迟 1.5秒 + 每个字符 100ms
      const textLength = gameState.currentScene?.dialogue?.length || 0;
      // 如果开启了语音，给予更多时间 (假设语速较慢)
      const charTime = isVoiceEnabled ? 250 : 150;
      const baseDelay = isVoiceEnabled ? 2000 : 1500;
      
      const delay = Math.max(2000, textLength * charTime + baseDelay);
      
      console.log(`[AutoPlay] Starting timer for next dialogue. Delay: ${delay}ms`);

      timeout = setTimeout(() => {
        console.log('[AutoPlay] Timer triggered, calling handleNextDialogue');
        // 再次检查状态（防止在延迟期间状态改变）
        if (!showChoices && !gameState.isPaused) {
          handleNextRef.current();
        }
      }, delay);
    } else {
      if (isAutoPlay) {
        console.log('[AutoPlay] Paused/Waiting conditions:', { isTyping, isLoading: gameState.isLoading, showChoices, isPaused: gameState.isPaused });
      }
    }
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [
    isAutoPlay, 
    isTyping, 
    gameState.isLoading, 
    showChoices, 
    gameState.isPaused, 
    gameState.currentScene?.dialogue, // 只依赖对话文本，而不是整个场景对象
    gameState.turn, // 依赖回合数
    isVoiceEnabled
  ]);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 暂停/继续
  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  // 设置对话框透明度
  const setDialogueOpacity = useCallback((opacity: number) => {
    setGameState(prev => ({ ...prev, dialogueOpacity: opacity }));
  }, []);

  // 返回标题
  const returnToTitle = useCallback(() => {
    resetToDefaultScript();
    resetBatchHistory();
    setDialogueQueue([]);
    setQueueIndex(0);
    setGameState(INITIAL_STATE);
    setShowChoices(false);
    setError(null);
  }, []);

  // 使用自定义剧本开始游戏
  const startWithScript = useCallback(async (script: ScriptTemplate) => {
    if (!hasApiKey) {
      setError("环境变量中缺失 API_KEY。");
      return;
    }

    setCurrentScript(script);
    setCustomScript(
      script.character.name,
      script.character.personality,
      script.setting,
      script.plotFramework
    );

    await audioService.init();
    audioService.playSfx('start');

    setGameState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    
    try {
      // 检查是否有缓存
      const dialogueCache = DialogueCacheService.getInstance();
      let batchData: BatchSceneData;
      
      if (dialogueCache.hasCachedBatchData(script.id)) {
        console.log(`[Game] 使用缓存的对话序列: ${script.name}`);
        batchData = cleanBatchDialogueData(dialogueCache.getCachedBatchData(script.id)!);
      } else {
        console.log(`[Game] 未找到缓存，实时生成: ${script.name}`);
        batchData = await startNewGameBatch();
        
        // 缓存生成的数据
        setTimeout(() => {
          dialogueCache.cacheManualData(script.id, batchData);
        }, 100);
      }
      
      console.log(`[Game] 获取到 ${batchData.dialogueSequence.length} 轮对话`);
      
      setDialogueQueue(batchData.dialogueSequence);
      setQueueIndex(0);
      setCurrentBatchChoices(batchData.choices);
      setCurrentBatchBackground(batchData.background);
      setCurrentBatchBgm(batchData.bgm);
      
      if (batchData.dialogueSequence.length > 0) {
        const firstNode = batchData.dialogueSequence[0];
        const firstScene = dialogueNodeToSceneData(
          firstNode, 
          batchData.choices, 
          batchData.background, 
          batchData.bgm
        );
        
        setGameState(prev => ({
          ...prev,
          currentScene: firstScene,
          history: [firstScene],
          affection: AFFECTION_INITIAL,
          isLoading: false,
          gameStarted: true,
          turn: 1,
        }));
      } else {
        throw new Error("生成的对话序列为空");
      }
      
    } catch (err) {
      console.error('[Game] 游戏启动失败:', err);
      setError("游戏启动失败，请重试。");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, [hasApiKey, dialogueNodeToSceneData]);

  // 保存通关记录
  const saveGameRecord = useCallback(() => {
    if (!currentScript) return;
    
    saveRecord({
      scriptId: currentScript.id,
      scriptName: currentScript.name,
      characterName: currentScript.character.name,
      endingType: determineEndingType(gameState.affection),
      finalAffection: gameState.affection,
      turnsPlayed: gameState.turn
    });
  }, [currentScript, gameState.affection, gameState.turn]);

  // 生成剧情框架
  const handleGeneratePlot = useCallback(async (prompt: string): Promise<string> => {
    return generatePlotFramework(prompt);
  }, []);

  return {
    gameState,
    showChoices,
    isTyping,
    setIsTyping,
    error,
    isMuted,
    isVoiceEnabled,
    isVoiceLoading,
    currentScript,
    hasApiKey,
    // 自动播放状态
    isAutoPlay,
    // 剧本模式状态
    isScriptMode,
    currentCG,
    currentChapterIndex,
    loadedScript,
    // 方法
    handleStartGame,
    handleChoice,
    handleToggleMute,
    handleNextDialogue,
    toggleVoice,
    toggleAutoPlay,
    clearError,
    togglePause,
    setDialogueOpacity,
    returnToTitle,
    startWithScript,
    handleGeneratePlot,
    saveGameRecord,
    // 剧本模式方法
    handleStartScriptGame,
  };
}
