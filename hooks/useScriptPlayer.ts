import { useState, useCallback } from 'react';
import { SceneData } from '../types';
import { 
  loadScript, 
  getChapterScenes, 
  getChoiceAffection,
  isEndingChapter,
  getEnding,
  FullScript 
} from '../services/scriptPlayerService';

interface ScriptPlayerState {
  isScriptMode: boolean;
  loadedScript: FullScript | null;
  currentChapterIndex: number;
  scriptDialogueIndex: number;
  currentCG: string | null;
  scriptScenes: SceneData[];
}

// 扩展的场景类型（包含 CG 信息）
interface ExtendedSceneData extends SceneData {
  cgImage?: string;
  isCG?: boolean;
}

const INITIAL_STATE: ScriptPlayerState = {
  isScriptMode: false,
  loadedScript: null,
  currentChapterIndex: 0,
  scriptDialogueIndex: 0,
  currentCG: null,
  scriptScenes: [],
};

export function useScriptPlayer() {
  const [state, setState] = useState<ScriptPlayerState>(INITIAL_STATE);

  /**
   * 加载并开始播放剧本
   */
  const startScript = useCallback(async (scriptId: string): Promise<SceneData | null> => {
    try {
      const script = await loadScript(scriptId);
      if (!script) {
        throw new Error(`无法加载剧本: ${scriptId}`);
      }
      
      console.log(`[ScriptPlayer] Loaded: ${script.title}, ${script.chapters.length} chapters`);
      
      // 获取第一章的场景数据
      const scenes = getChapterScenes(script, 0, scriptId);
      if (scenes.length === 0) {
        throw new Error("剧本第一章没有对话");
      }
      
      const firstScene = scenes[0] as ExtendedSceneData;
      
      setState({
        isScriptMode: true,
        loadedScript: script,
        currentChapterIndex: 0,
        scriptDialogueIndex: 0,
        currentCG: firstScene.isCG && firstScene.cgImage ? firstScene.cgImage : null,
        scriptScenes: scenes,
      });
      
      return firstScene;
    } catch (error) {
      console.error('[ScriptPlayer] Load failed:', error);
      throw error;
    }
  }, []);

  /**
   * 前进到下一句对话
   * @returns 下一个场景，如果章节结束则返回 null
   */
  const advanceDialogue = useCallback((): { scene: SceneData | null; showChoices: boolean } => {
    const nextIndex = state.scriptDialogueIndex + 1;
    
    if (nextIndex < state.scriptScenes.length) {
      const nextScene = state.scriptScenes[nextIndex] as ExtendedSceneData;
      
      setState(prev => ({
        ...prev,
        scriptDialogueIndex: nextIndex,
        currentCG: nextScene.isCG && nextScene.cgImage ? nextScene.cgImage : null,
      }));
      
      // 检查是否是最后一句对话（需要显示选择）
      const isLastDialogue = nextIndex === state.scriptScenes.length - 1;
      const hasChoices = nextScene.choices && nextScene.choices.length > 0;
      
      return { 
        scene: nextScene, 
        showChoices: isLastDialogue && hasChoices 
      };
    }
    
    return { scene: null, showChoices: false };
  }, [state.scriptDialogueIndex, state.scriptScenes]);

  /**
   * 处理选择并进入下一章
   * @returns 新章节的第一个场景和好感度变化
   */
  const handleChoice = useCallback((choiceIndex: number): { 
    scene: SceneData | null; 
    affectionChange: number;
    isEnding: boolean;
  } => {
    if (!state.loadedScript) {
      return { scene: null, affectionChange: 0, isEnding: false };
    }
    
    // 获取好感度变化
    const affectionChange = getChoiceAffection(state.loadedScript, state.currentChapterIndex, choiceIndex);
    
    // 检查是否有下一章
    const nextChapterIndex = state.currentChapterIndex + 1;
    
    if (nextChapterIndex < state.loadedScript.chapters.length) {
      // 进入下一章
      const nextScenes = getChapterScenes(state.loadedScript, nextChapterIndex, state.loadedScript.id);
      const firstScene = nextScenes[0] as ExtendedSceneData;
      
      setState(prev => ({
        ...prev,
        currentChapterIndex: nextChapterIndex,
        scriptDialogueIndex: 0,
        scriptScenes: nextScenes,
        currentCG: firstScene.isCG && firstScene.cgImage ? firstScene.cgImage : null,
      }));
      
      // 检查是否是结局章节
      const isEnding = isEndingChapter(state.loadedScript, nextChapterIndex);
      if (isEnding) {
        const ending = getEnding(state.loadedScript, nextChapterIndex);
        console.log('[ScriptPlayer] Reached ending:', ending?.title);
      }
      
      return { scene: firstScene, affectionChange, isEnding };
    }
    
    // 所有章节完成
    console.log('[ScriptPlayer] Script completed');
    return { scene: null, affectionChange, isEnding: true };
  }, [state.loadedScript, state.currentChapterIndex]);

  /**
   * 重置剧本播放器
   */
  const resetScript = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  /**
   * 获取当前场景
   */
  const getCurrentScene = useCallback((): SceneData | null => {
    if (state.scriptDialogueIndex >= state.scriptScenes.length) return null;
    return state.scriptScenes[state.scriptDialogueIndex];
  }, [state.scriptDialogueIndex, state.scriptScenes]);

  return {
    // State
    isScriptMode: state.isScriptMode,
    loadedScript: state.loadedScript,
    currentChapterIndex: state.currentChapterIndex,
    scriptDialogueIndex: state.scriptDialogueIndex,
    currentCG: state.currentCG,
    scriptScenes: state.scriptScenes,
    // Methods
    startScript,
    advanceDialogue,
    handleChoice,
    resetScript,
    getCurrentScene,
  };
}
