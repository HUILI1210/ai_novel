import { useState, useEffect, useCallback } from 'react';
import { audioService } from '../services/audioService';
import { generateSpeech } from '../services/aiService';
import { BgmMood, SceneData } from '../types';

interface UseAudioControlOptions {
  currentScene: SceneData | null;
  characterName?: string;
}

export function useAudioControl({ currentScene, characterName = '雯曦' }: UseAudioControlOptions) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);

  // BGM 同步
  useEffect(() => {
    if (currentScene?.bgm) {
      audioService.playBgm(currentScene.bgm);
    }
  }, [currentScene?.bgm]);

  // 语音生成
  useEffect(() => {
    const playVoiceLine = async () => {
      if (!isVoiceEnabled || !currentScene) return;
      
      // 只为角色配音
      if (currentScene.speaker !== characterName) return;

      setIsVoiceLoading(true);
      try {
        const audioBase64 = await generateSpeech(currentScene.dialogue);
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
  }, [currentScene, isVoiceEnabled, characterName]);

  const toggleMute = useCallback(() => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  }, []);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => !prev);
  }, []);

  const initAudio = useCallback(async () => {
    await audioService.init();
  }, []);

  const playSfx = useCallback((sfxName: 'start' | 'next' | 'type') => {
    audioService.playSfx(sfxName);
  }, []);

  return {
    isMuted,
    isVoiceEnabled,
    isVoiceLoading,
    toggleMute,
    toggleVoice,
    initAudio,
    playSfx,
  };
}
