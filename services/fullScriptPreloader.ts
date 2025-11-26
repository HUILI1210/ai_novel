/**
 * 完整剧本预加载服务
 * 一次性生成整条剧本线，包括文本、语音、图片
 */

import { BatchSceneData, DialogueNode, CharacterExpression } from '../types';
import { generateBatchDialogue, generateSpeech, setCustomScript } from './aiService';
import { ScriptTemplate } from '../types';

// 预加载状态
export interface PreloadProgress {
  phase: 'text' | 'voice' | 'image' | 'complete';
  current: number;
  total: number;
  message: string;
}

// 完整剧本数据结构
export interface FullScriptData {
  scriptId: string;
  acts: ActData[];
  totalDialogues: number;
  generatedAt: number;
}

export interface ActData {
  actNumber: number;
  title: string;
  sceneData: BatchSceneData;
  voiceUrls: Map<number, string>;  // dialogueIndex -> voiceUrl
  branches: BranchData[];
}

export interface BranchData {
  choiceText: string;
  sentiment: string;
  sceneData: BatchSceneData;
  voiceUrls: Map<number, string>;
}

// 缓存键
const FULL_SCRIPT_CACHE_KEY = 'ai_novel_full_script_cache';

/**
 * 完整剧本预加载器
 */
export class FullScriptPreloader {
  private static instance: FullScriptPreloader;
  private cache: Map<string, FullScriptData> = new Map();
  private isPreloading = false;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): FullScriptPreloader {
    if (!FullScriptPreloader.instance) {
      FullScriptPreloader.instance = new FullScriptPreloader();
    }
    return FullScriptPreloader.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(FULL_SCRIPT_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 恢复Map结构
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          this.cache.set(key, value);
        });
      }
    } catch (e) {
      console.error('[FullScriptPreloader] 加载缓存失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, FullScriptData> = {};
      this.cache.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(FULL_SCRIPT_CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.error('[FullScriptPreloader] 保存缓存失败:', e);
    }
  }

  /**
   * 检查剧本是否已完整预加载
   */
  hasFullScript(scriptId: string): boolean {
    return this.cache.has(scriptId);
  }

  /**
   * 获取已缓存的完整剧本
   */
  getFullScript(scriptId: string): FullScriptData | null {
    return this.cache.get(scriptId) || null;
  }

  /**
   * 一次性预加载完整剧本线
   */
  async preloadFullScript(
    script: ScriptTemplate,
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<FullScriptData | null> {
    if (this.isPreloading) {
      console.log('[FullScriptPreloader] 已有预加载任务进行中');
      return null;
    }

    this.isPreloading = true;
    const acts: ActData[] = [];

    try {
      // 设置剧本上下文
      setCustomScript(
        script.character.name,
        script.character.personality,
        script.setting,
        script.plotFramework
      );

      // 生成第一幕
      onProgress?.({ phase: 'text', current: 1, total: 3, message: '正在生成第一幕对话...' });
      
      const act1Context = `开始游戏。这是故事的开端。
角色：${script.character.name}
性格：${script.character.personality}
背景：${script.setting}

请生成精彩的开场对话序列（10-12轮），建立角色关系和故事氛围。
对话必须完整、自然，使用流畅的简体中文。`;

      const act1Data = await generateBatchDialogue(act1Context, true);
      
      const act1: ActData = {
        actNumber: 1,
        title: '序章',
        sceneData: act1Data,
        voiceUrls: new Map(),
        branches: []
      };

      // 预加载第一幕的所有分支
      if (act1Data.choices && act1Data.choices.length > 0) {
        onProgress?.({ phase: 'text', current: 2, total: 3, message: '正在生成分支剧情...' });
        
        for (let i = 0; i < act1Data.choices.length; i++) {
          const choice = act1Data.choices[i];
          await new Promise(r => setTimeout(r, 500)); // 避免API限制
          
          const branchContext = `玩家选择了："${choice.text}"（情感倾向：${choice.sentiment}）。
请生成该选择后的对话序列（8-10轮）。
对话必须完整、自然，体现选择的影响。`;

          try {
            const branchData = await generateBatchDialogue(branchContext, false);
            act1.branches.push({
              choiceText: choice.text,
              sentiment: choice.sentiment,
              sceneData: branchData,
              voiceUrls: new Map()
            });
          } catch (e) {
            console.error(`[FullScriptPreloader] 分支 ${choice.text} 生成失败:`, e);
          }
        }
      }

      acts.push(act1);

      // 生成第二幕（基于第一个选择）
      if (act1.branches.length > 0) {
        onProgress?.({ phase: 'text', current: 3, total: 3, message: '正在生成第二幕对话...' });
        await new Promise(r => setTimeout(r, 800));

        const act2Context = `继续故事发展，这是第二幕。
之前玩家选择了"${act1Data.choices[0].text}"。
请生成新的对话序列（10-12轮），推进剧情发展，增加角色互动。`;

        try {
          const act2Data = await generateBatchDialogue(act2Context, false);
          
          const act2: ActData = {
            actNumber: 2,
            title: '第一章',
            sceneData: act2Data,
            voiceUrls: new Map(),
            branches: []
          };

          // 预加载第二幕分支
          for (const choice of act2Data.choices || []) {
            await new Promise(r => setTimeout(r, 500));
            
            try {
              const branchData = await generateBatchDialogue(
                `玩家选择了："${choice.text}"。继续故事。`,
                false
              );
              act2.branches.push({
                choiceText: choice.text,
                sentiment: choice.sentiment,
                sceneData: branchData,
                voiceUrls: new Map()
              });
            } catch (e) {
              console.error(`[FullScriptPreloader] 第二幕分支失败:`, e);
            }
          }

          acts.push(act2);
        } catch (e) {
          console.error('[FullScriptPreloader] 第二幕生成失败:', e);
        }
      }

      // 计算总对话数
      let totalDialogues = 0;
      acts.forEach(act => {
        totalDialogues += act.sceneData.dialogueSequence.length;
        act.branches.forEach(branch => {
          totalDialogues += branch.sceneData.dialogueSequence.length;
        });
      });

      const fullScriptData: FullScriptData = {
        scriptId: script.id,
        acts,
        totalDialogues,
        generatedAt: Date.now()
      };

      // 保存到缓存
      this.cache.set(script.id, fullScriptData);
      this.saveToStorage();

      onProgress?.({ phase: 'complete', current: 1, total: 1, message: '预加载完成！' });
      
      console.log(`[FullScriptPreloader] 剧本 ${script.name} 预加载完成，共 ${totalDialogues} 轮对话`);
      
      this.isPreloading = false;
      return fullScriptData;

    } catch (error) {
      console.error('[FullScriptPreloader] 预加载失败:', error);
      this.isPreloading = false;
      onProgress?.({ phase: 'complete', current: 0, total: 1, message: '预加载失败' });
      return null;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(scriptId?: string): void {
    if (scriptId) {
      this.cache.delete(scriptId);
    } else {
      this.cache.clear();
    }
    this.saveToStorage();
  }
}

export const fullScriptPreloader = FullScriptPreloader.getInstance();
