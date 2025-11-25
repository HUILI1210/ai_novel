import { useState, useEffect, useCallback } from 'react';
import { startNewGame, makeChoice, generateCharacterImage, generateSpeech } from '../services/aiService';
import { GameState } from '../types';
import { audioService } from '../services/audioService';
import { AFFECTION_MIN, AFFECTION_MAX, AFFECTION_INITIAL } from '../constants/config';

const INITIAL_STATE: GameState = {
  currentScene: null,
  history: [],
  affection: AFFECTION_INITIAL,
  isLoading: false,
  gameStarted: false,
  turn: 0,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showChoices, setShowChoices] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [spriteCache, setSpriteCache] = useState<Record<string, string>>({});
  const [currentSpriteUrl, setCurrentSpriteUrl] = useState<string | null>(null);

  // 检查是否有可用的 API Key
  const hasApiKey = !!(process.env.GEMINI_API_KEY || (process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY !== 'your-dashscope-api-key'));

  // Audio Sync Effect
  useEffect(() => {
    if (gameState.currentScene?.bgm) {
      audioService.playBgm(gameState.currentScene.bgm);
    }
  }, [gameState.currentScene?.bgm]);

  // Image Generation Effect
  useEffect(() => {
    const updateSprite = async () => {
      if (!gameState.currentScene) return;
      const expression = gameState.currentScene.expression;

      // Check cache first
      if (spriteCache[expression]) {
        setCurrentSpriteUrl(spriteCache[expression]);
        return;
      }

      // Generate new image
      try {
        const url = await generateCharacterImage(expression);
        if (url) {
          setSpriteCache(prev => ({ ...prev, [expression]: url }));
          setGameState(current => {
            if (current.currentScene?.expression === expression) {
              setCurrentSpriteUrl(url);
            }
            return current;
          });
        }
      } catch (e) {
        console.error("Failed to load sprite", e);
      }
    };

    updateSprite();
    // Note: spriteCache is intentionally omitted to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentScene?.expression]);

  // Voice Generation Effect
  useEffect(() => {
    const playVoiceLine = async () => {
      if (!isVoiceEnabled || !gameState.currentScene) return;
      
      // Only voice Aiko
      if (gameState.currentScene.speaker !== '爱子') return;

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
  }, [gameState.currentScene, isVoiceEnabled]);

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
      const firstScene = await startNewGame();
      setGameState({
        currentScene: firstScene,
        history: [firstScene],
        affection: AFFECTION_INITIAL,
        isLoading: false,
        gameStarted: true,
        turn: 1,
      });
    } catch (err) {
      setError("游戏启动失败，请重试。");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, [hasApiKey]);

  const handleChoice = useCallback(async (choiceText: string) => {
    setShowChoices(false);
    setGameState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const nextScene = await makeChoice(choiceText);
      
      setGameState(prev => {
        const newAffection = Math.min(
          AFFECTION_MAX, 
          Math.max(AFFECTION_MIN, prev.affection + (nextScene.affectionChange || 0))
        );
        return {
          ...prev,
          currentScene: nextScene,
          history: [...prev.history, nextScene],
          affection: newAffection,
          isLoading: false,
          turn: prev.turn + 1
        };
      });
    } catch (err) {
      setError("加载下一幕失败。");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleNextDialogue = useCallback(() => {
    if (gameState.isLoading) return;
    if (showChoices) return;
    if (gameState.currentScene?.isGameOver) return;

    setShowChoices(true);
  }, [gameState.isLoading, showChoices, gameState.currentScene?.isGameOver]);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
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
    currentSpriteUrl,
    hasApiKey,
    handleStartGame,
    handleChoice,
    handleToggleMute,
    handleNextDialogue,
    toggleVoice,
    clearError,
  };
}
