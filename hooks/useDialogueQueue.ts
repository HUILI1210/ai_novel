import { useState, useCallback } from 'react';
import { DialogueNode, BatchSceneData, BackgroundType, BgmMood, GameChoice } from '../types';

interface DialogueQueueState {
  dialogueQueue: DialogueNode[];
  queueIndex: number;
  currentBatchChoices: GameChoice[];
  currentBatchBackground: BackgroundType;
  currentBatchBgm: BgmMood;
}

const INITIAL_STATE: DialogueQueueState = {
  dialogueQueue: [],
  queueIndex: 0,
  currentBatchChoices: [],
  currentBatchBackground: BackgroundType.SCHOOL_ROOFTOP,
  currentBatchBgm: BgmMood.DAILY,
};

export function useDialogueQueue() {
  const [state, setState] = useState<DialogueQueueState>(INITIAL_STATE);

  /**
   * 初始化对话队列（从 BatchSceneData）
   */
  const initQueue = useCallback((batchData: BatchSceneData) => {
    setState({
      dialogueQueue: batchData.dialogueSequence,
      queueIndex: 0,
      currentBatchChoices: batchData.choices,
      currentBatchBackground: batchData.background,
      currentBatchBgm: batchData.bgm,
    });
    console.log(`[DialogueQueue] Initialized with ${batchData.dialogueSequence.length} dialogues`);
  }, []);

  /**
   * 获取当前对话节点
   */
  const getCurrentNode = useCallback((): DialogueNode | null => {
    if (state.queueIndex >= state.dialogueQueue.length) return null;
    return state.dialogueQueue[state.queueIndex];
  }, [state.dialogueQueue, state.queueIndex]);

  /**
   * 前进到下一个对话
   * @returns 下一个对话节点，如果队列结束则返回 null
   */
  const advanceQueue = useCallback((): DialogueNode | null => {
    const nextIndex = state.queueIndex + 1;
    
    if (nextIndex < state.dialogueQueue.length) {
      setState(prev => ({ ...prev, queueIndex: nextIndex }));
      console.log(`[DialogueQueue] Advanced to ${nextIndex + 1}/${state.dialogueQueue.length}`);
      return state.dialogueQueue[nextIndex];
    }
    
    console.log('[DialogueQueue] Queue ended');
    return null;
  }, [state.dialogueQueue, state.queueIndex]);

  /**
   * 检查队列是否结束
   */
  const isQueueEnd = useCallback((): boolean => {
    return state.queueIndex >= state.dialogueQueue.length - 1;
  }, [state.dialogueQueue.length, state.queueIndex]);

  /**
   * 重置队列
   */
  const resetQueue = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    // State
    dialogueQueue: state.dialogueQueue,
    queueIndex: state.queueIndex,
    currentBatchChoices: state.currentBatchChoices,
    currentBatchBackground: state.currentBatchBackground,
    currentBatchBgm: state.currentBatchBgm,
    // Methods
    initQueue,
    getCurrentNode,
    advanceQueue,
    isQueueEnd,
    resetQueue,
  };
}
