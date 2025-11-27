/**
 * 剧本库服务 - 管理剧本模板的保存和加载
 */

import { ScriptTemplate, CharacterConfig } from '../types';

const STORAGE_KEY = 'gala_script_library';
const GENERATED_PLOTS_KEY = 'gala_generated_plots';

// 预设剧本ID列表（不可删除）
const PRESET_SCRIPT_IDS = ['default', 'preset_tsundere', 'preset_princess', 'preset_courtesan'];

// 预设剧本1：傲娇青梅竹马
const PRESET_TSUNDERE: ScriptTemplate = {
  id: 'preset_tsundere',
  name: '💕 傲娇青梅竹马',
  description: '经典校园恋爱，从小一起长大的她对你有着说不出口的心意',
  plotFramework: '',  // 需要一键生成
  character: {
    name: '雯曦',
    personality: '傲娇、害羞、嘴硬心软、暗恋主角多年却不敢表白',
    appearance: '长直黑发及腰、紫罗兰色眼眸、深蓝色水手服配红色领巾、白色过膝袜',
    relationship: '从小一起长大的邻居青梅竹马，每天一起上下学'
  },
  setting: '现代日本高中，樱花盛开的春天',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 预设剧本2：白金蔷薇
const PRESET_PRINCESS: ScriptTemplate = {
  id: 'preset_princess',
  name: '👑 白金蔷薇：温柔公主的骑士誓约',
  description: '温柔治愈的公主与忠诚骑士的爱情誓约，从守护到相爱的宫廷恋曲',
  plotFramework: '',  // 需要一键生成
  character: {
    name: '艾琳娜',
    personality: '温柔治愈、善良体贴、脆弱敏感、在逆境中觉醒成长',
    appearance: '金色长卷发如流金、宝石蓝眼眸、完美S型曲线、白色镶金礼服、纯白高透丝袜',
    relationship: '艾尔兰王国长公主，你是她的专属皇家骑士护卫'
  },
  setting: '中世纪欧洲风格奇幻王国，魔法与剑的时代',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 预设剧本3：古风绝世花魁
const PRESET_COURTESAN: ScriptTemplate = {
  id: 'preset_courtesan',
  name: '🌸 古风绝世花魁',
  description: '落魄书生与京城第一花魁的倾城之恋，风尘中寻觅真心',
  plotFramework: '',  // 需要一键生成
  character: {
    name: '柳如烟',
    personality: '才情绝艳、看透世情却仍怀希望、外柔内刚、渴望一份真心相待',
    appearance: '乌发云鬓斜插玉簪、柳眉杏眼含情脉脉、绛红罗裙曳地、手执绣花团扇',
    relationship: '京城醉月楼第一花魁，才艺双绝名动京城，你是赴京赶考的落魄书生'
  },
  setting: '中国古代繁华京城，烟柳画桥风帘翠幕',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// 默认剧本（保持兼容）
const DEFAULT_TEMPLATE: ScriptTemplate = PRESET_TSUNDERE;

// 所有预设剧本
const ALL_PRESET_SCRIPTS: ScriptTemplate[] = [
  PRESET_TSUNDERE,
  PRESET_PRINCESS,
  PRESET_COURTESAN
];

// 检查是否为预设剧本（不可删除）
export const isPresetScript = (id: string): boolean => {
  return PRESET_SCRIPT_IDS.includes(id);
};

// 获取已生成剧情的记录
export const getGeneratedPlots = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(GENERATED_PLOTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// 保存生成的剧情
export const saveGeneratedPlot = (scriptId: string, plot: string): void => {
  const plots = getGeneratedPlots();
  plots[scriptId] = plot;
  localStorage.setItem(GENERATED_PLOTS_KEY, JSON.stringify(plots));
};

// 检查剧本是否已生成全文
export const hasGeneratedPlot = (scriptId: string): boolean => {
  const plots = getGeneratedPlots();
  return !!plots[scriptId] && plots[scriptId].length > 100;
};

// 获取剧本的完整剧情（优先使用已生成的）
export const getScriptPlot = (scriptId: string): string => {
  const plots = getGeneratedPlots();
  if (plots[scriptId]) {
    return plots[scriptId];
  }
  // 返回预设剧本的原始 plotFramework（现在为空）
  const script = ALL_PRESET_SCRIPTS.find(s => s.id === scriptId);
  return script?.plotFramework || '';
};

// 获取所有剧本
export const getAllScripts = (): ScriptTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let userScripts: ScriptTemplate[] = [];
    
    if (stored) {
      userScripts = JSON.parse(stored) as ScriptTemplate[];
      // 过滤掉旧的预设剧本（会用最新的替换）
      userScripts = userScripts.filter(s => !isPresetScript(s.id));
    }
    
    // 为预设剧本填充已生成的剧情
    const plots = getGeneratedPlots();
    const presetsWithPlots = ALL_PRESET_SCRIPTS.map(script => ({
      ...script,
      plotFramework: plots[script.id] || script.plotFramework
    }));
    
    // 预设剧本在前，用户剧本在后
    return [...presetsWithPlots, ...userScripts];
  } catch (e) {
    console.error('Failed to load scripts:', e);
  }
  return [...ALL_PRESET_SCRIPTS];
};

// 获取单个剧本
export const getScriptById = (id: string): ScriptTemplate | null => {
  const scripts = getAllScripts();
  return scripts.find(s => s.id === id) || null;
};

// 保存剧本
export const saveScript = (script: ScriptTemplate): void => {
  const scripts = getAllScripts();
  const existingIndex = scripts.findIndex(s => s.id === script.id);
  
  if (existingIndex >= 0) {
    scripts[existingIndex] = { ...script, updatedAt: Date.now() };
  } else {
    scripts.push({ ...script, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
};

// 更新剧本（别名）
export const updateScript = saveScript;

// 删除剧本
export const deleteScript = (id: string): boolean => {
  // 预设剧本不可删除
  if (isPresetScript(id)) return false;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  
  const scripts = JSON.parse(stored) as ScriptTemplate[];
  const filtered = scripts.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

// 创建新剧本
export const createScript = (
  name: string,
  character: CharacterConfig,
  plotFramework: string,
  setting: string,
  description: string = ''
): ScriptTemplate => {
  const newScript: ScriptTemplate = {
    id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    plotFramework,
    character,
    setting,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  saveScript(newScript);
  return newScript;
};

// 生成剧情框架的提示词
export const generatePlotFrameworkPrompt = (character: CharacterConfig, setting: string): string => {
  return `请根据以下角色和设定，生成一个有趣的剧情框架：

角色名称：${character.name}
角色性格：${character.personality}
角色外貌：${character.appearance}
与主角关系：${character.relationship}
故事背景：${setting}

请生成一个包含开端、发展、高潮、结局的简短剧情框架（约100字）。`;
};

// 获取默认剧本模板
export const getDefaultTemplate = (): ScriptTemplate => {
  return { ...DEFAULT_TEMPLATE };
};

// 清除生成的剧情缓存
export const clearGeneratedPlots = (): void => {
  localStorage.removeItem(GENERATED_PLOTS_KEY);
};
