import { ScriptTemplate, BatchSceneData } from '../types';
import { startNewGameBatch, generateBranchDialogue, cleanBatchDialogueData } from './aiService';

interface CachedBatchData {
  scriptId: string;
  batchData: BatchSceneData;
  generatedAt: number;
  version: string;
}

// 分支缓存（第二幕）
interface CachedBranchData {
  scriptId: string;
  choiceText: string;
  branchData: BatchSceneData;
  generatedAt: number;
  version: string;
}

const DIALOGUE_CACHE_KEY = 'ai_novel_batch_cache';
const BRANCH_CACHE_KEY = 'ai_novel_branch_cache';
const CACHE_VERSION = '1.0.1';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class DialogueCacheService {
  private static instance: DialogueCacheService;
  private cache: Map<string, CachedBatchData> = new Map();
  private branchCache: Map<string, CachedBranchData> = new Map();
  private isPreGenerating: boolean = false; // 防止重复预加载

  static getInstance(): DialogueCacheService {
    if (!DialogueCacheService.instance) {
      DialogueCacheService.instance = new DialogueCacheService();
    }
    return DialogueCacheService.instance;
  }

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      // 加载第一幕缓存 - 加载时清理文本
      const cached = localStorage.getItem(DIALOGUE_CACHE_KEY);
      if (cached) {
        const data: CachedBatchData[] = JSON.parse(cached);
        this.cache = new Map(
          data
            .filter(item => item.version === CACHE_VERSION && 
                   Date.now() - item.generatedAt < CACHE_EXPIRY_MS)
            .map(item => [item.scriptId, {
              ...item,
              batchData: cleanBatchDialogueData(item.batchData)
            }])
        );
      }
      
      // 加载第二幕分支缓存 - 加载时清理文本
      const branchCached = localStorage.getItem(BRANCH_CACHE_KEY);
      if (branchCached) {
        const branchData: CachedBranchData[] = JSON.parse(branchCached);
        this.branchCache = new Map(
          branchData
            .filter(item => item.version === CACHE_VERSION && 
                   Date.now() - item.generatedAt < CACHE_EXPIRY_MS)
            .map(item => [`${item.scriptId}_${item.choiceText}`, {
              ...item,
              branchData: cleanBatchDialogueData(item.branchData)
            }])
        );
      }
    } catch (error) {
      console.warn('Failed to load batch data cache:', error);
      this.cache.clear();
      this.branchCache.clear();
    }
  }

  private saveCache(): void {
    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(DIALOGUE_CACHE_KEY, JSON.stringify(data));
      
      const branchData = Array.from(this.branchCache.values());
      localStorage.setItem(BRANCH_CACHE_KEY, JSON.stringify(branchData));
    } catch (error) {
      console.warn('Failed to save batch data cache:', error);
    }
  }

  getCachedBatchData(scriptId: string): BatchSceneData | null {
    const cached = this.cache.get(scriptId);
    return cached?.batchData || null;
  }

  hasCachedBatchData(scriptId: string): boolean {
    return this.cache.has(scriptId);
  }
  
  // 获取第二幕分支缓存
  getCachedBranchData(scriptId: string, choiceText: string): BatchSceneData | null {
    const key = `${scriptId}_${choiceText}`;
    const cached = this.branchCache.get(key);
    return cached?.branchData || null;
  }
  
  hasCachedBranchData(scriptId: string, choiceText: string): boolean {
    const key = `${scriptId}_${choiceText}`;
    return this.branchCache.has(key);
  }

  // 手动缓存已生成的数据（避免重复生成）
  cacheManualData(scriptId: string, data: BatchSceneData): void {
    if (this.hasCachedBatchData(scriptId)) return;
    
    const cachedBatchData: CachedBatchData = {
      scriptId: scriptId,
      batchData: cleanBatchDialogueData(data),
      generatedAt: Date.now(),
      version: CACHE_VERSION
    };

    this.cache.set(scriptId, cachedBatchData);
    this.saveCache();
    console.log(`[DialogueCache] 手动缓存了剧本 ${scriptId} 的数据`);
  }

  async generateAndCacheBatchData(script: ScriptTemplate): Promise<BatchSceneData> {
    // Check if already cached
    if (this.hasCachedBatchData(script.id)) {
      return this.getCachedBatchData(script.id)!;
    }

    try {
      // Set the script context and generate batch data
      const { setCustomScript } = await import('./aiService');
      setCustomScript(
        script.character.name,
        script.character.personality,
        script.setting,
        script.plotFramework
      );

      // Generate the actual batch data using the same logic as the game
      const batchData = await startNewGameBatch();
      
      // Cache the result
      const cachedBatchData: CachedBatchData = {
        scriptId: script.id,
        batchData: batchData,
        generatedAt: Date.now(),
        version: CACHE_VERSION
      };

      this.cache.set(script.id, cachedBatchData);
      this.saveCache();

      console.log(`[DialogueCache] 缓存剧本 ${script.name} 的初始对话序列`);
      return batchData;
    } catch (error) {
      console.error(`Failed to generate batch data for script ${script.id}:`, error);
      throw error;
    }
  }

  // 预加载第一个预设剧本的前两幕
  async preGenerateFirstScriptTwoActs(scripts: ScriptTemplate[]): Promise<void> {
    // 防止重复预加载
    if (this.isPreGenerating) {
      console.log('[DialogueCache] 预加载已在进行中，跳过');
      return;
    }
    
    const firstPreset = scripts.find(s => s.id === 'preset_tsundere');
    if (!firstPreset) {
      console.log('[DialogueCache] 未找到第一个预设剧本');
      return;
    }
    
    // 检查是否已完全缓存
    if (this.hasCachedBatchData(firstPreset.id)) {
      const cachedData = this.getCachedBatchData(firstPreset.id);
      if (cachedData && cachedData.choices) {
        const allBranchesCached = cachedData.choices.every(
          choice => this.hasCachedBranchData(firstPreset.id, choice.text)
        );
        if (allBranchesCached) {
          console.log('[DialogueCache] 第一个剧本前两幕已完全缓存');
          return;
        }
      }
    }
    
    this.isPreGenerating = true;
    console.log('[DialogueCache] 开始预加载第一个剧本的前两幕...');
    
    try {
      // 第一幕：生成初始对话序列
      console.log('[DialogueCache] 生成第一幕：初始对话序列');
      const firstActData = await this.generateAndCacheBatchData(firstPreset);
      
      if (!firstActData.choices || firstActData.choices.length === 0) {
        console.warn('[DialogueCache] 第一幕没有选择项，跳过第二幕预加载');
        this.isPreGenerating = false;
        return;
      }
      
      // 第二幕：预加载所有分支
      console.log(`[DialogueCache] 生成第二幕：${firstActData.choices.length} 个分支`);
      
      for (let i = 0; i < firstActData.choices.length; i++) {
        const choice = firstActData.choices[i];
        const cacheKey = `${firstPreset.id}_${choice.text}`;
        
        // 检查是否已缓存
        if (this.branchCache.has(cacheKey)) {
          console.log(`[DialogueCache] 分支 ${i + 1}/${firstActData.choices.length} 已缓存: "${choice.text.substring(0, 15)}..."`);
          continue;
        }
        
        try {
          console.log(`[DialogueCache] 预加载分支 ${i + 1}/${firstActData.choices.length}: "${choice.text.substring(0, 15)}..."`);
          
          const branchData = await generateBranchDialogue(choice.text, choice.sentiment);
          
          const cachedBranchData: CachedBranchData = {
            scriptId: firstPreset.id,
            choiceText: choice.text,
            branchData: branchData,
            generatedAt: Date.now(),
            version: CACHE_VERSION
          };
          
          this.branchCache.set(cacheKey, cachedBranchData);
          this.saveCache();
          
          console.log(`[DialogueCache] 分支 ${i + 1} 缓存成功，包含 ${branchData.dialogueSequence?.length || 0} 轮对话`);
          
          // 分支之间添加延迟避免API限制
          if (i < firstActData.choices.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`[DialogueCache] 分支 ${i + 1} 预加载失败:`, error);
        }
      }
      
      console.log('[DialogueCache] 第一个剧本前两幕预加载完成！');
      this.isPreGenerating = false;
      
    } catch (error) {
      console.error('[DialogueCache] 预加载失败:', error);
      this.isPreGenerating = false;
    }
  }

  async preGenerateAllBatchData(scripts: ScriptTemplate[]): Promise<void> {
    // 延迟10秒后开始预加载，确保不与游戏启动冲突
    console.log('[DialogueCache] 将在10秒后开始后台预加载...');
    setTimeout(() => {
      this.preGenerateFirstScriptTwoActs(scripts).catch(error => {
        console.error('[DialogueCache] 后台预加载失败:', error);
      });
    }, 10000);
  }

  // 预加载指定剧本的前两幕（供剧本库按钮调用）
  async preloadScript(script: ScriptTemplate, onProgress?: (status: string, progress: number) => void): Promise<boolean> {
    if (this.isPreGenerating) {
      console.log('[DialogueCache] 预加载已在进行中');
      return false;
    }

    this.isPreGenerating = true;
    
    try {
      onProgress?.('正在生成第一幕对话...', 10);
      
      // 第一幕：生成初始对话序列
      const firstActData = await this.generateAndCacheBatchData(script);
      onProgress?.('第一幕完成', 40);
      
      if (!firstActData.choices || firstActData.choices.length === 0) {
        console.warn('[DialogueCache] 第一幕没有选择项');
        this.isPreGenerating = false;
        onProgress?.('预加载完成（无分支）', 100);
        return true;
      }
      
      // 第二幕：预加载所有分支
      const totalBranches = firstActData.choices.length;
      for (let i = 0; i < totalBranches; i++) {
        const choice = firstActData.choices[i];
        const cacheKey = `${script.id}_${choice.text}`;
        
        onProgress?.(`正在预加载分支 ${i + 1}/${totalBranches}...`, 40 + (i / totalBranches) * 55);
        
        // 检查是否已缓存
        if (this.branchCache.has(cacheKey)) {
          continue;
        }
        
        try {
          const branchData = await generateBranchDialogue(choice.text, choice.sentiment);
          
          const cachedBranchData: CachedBranchData = {
            scriptId: script.id,
            choiceText: choice.text,
            branchData: branchData,
            generatedAt: Date.now(),
            version: CACHE_VERSION
          };
          
          this.branchCache.set(cacheKey, cachedBranchData);
          this.saveCache();
          
          // 分支之间添加延迟
          if (i < totalBranches - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          console.error(`[DialogueCache] 分支 ${i + 1} 预加载失败:`, error);
        }
      }
      
      this.isPreGenerating = false;
      onProgress?.('预加载完成！', 100);
      console.log(`[DialogueCache] 剧本 ${script.name} 预加载完成`);
      return true;
      
    } catch (error) {
      console.error('[DialogueCache] 预加载失败:', error);
      this.isPreGenerating = false;
      onProgress?.('预加载失败', 0);
      return false;
    }
  }

  // 检查剧本是否已完全缓存
  isScriptFullyCached(scriptId: string): boolean {
    if (!this.hasCachedBatchData(scriptId)) return false;
    
    const cachedData = this.getCachedBatchData(scriptId);
    if (!cachedData?.choices || cachedData.choices.length === 0) return true;
    
    return cachedData.choices.every(
      choice => this.hasCachedBranchData(scriptId, choice.text)
    );
  }

  clearCache(): void {
    this.cache.clear();
    this.branchCache.clear();
    localStorage.removeItem(DIALOGUE_CACHE_KEY);
    localStorage.removeItem(BRANCH_CACHE_KEY);
    console.log('[DialogueCache] 所有缓存已清空');
  }

  getCacheStats(): { total: number; cached: number; presetCached: number } {
    const presetIds = ['preset_tsundere', 'preset_princess', 'preset_courtesan'];
    const cached = this.cache.size;
    const presetCached = presetIds.filter(id => this.cache.has(id)).length;
    
    return {
      total: 3, // Total preset scripts
      cached,
      presetCached
    };
  }
}
