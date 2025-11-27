/**
 * 统一 AI 服务
 * 支持多个提供商：Gemini (Google) 和 OpenRouter
 * 通过配置切换
 */

import { SceneData, CharacterExpression, BackgroundType, BgmMood, BatchSceneData, DialogueNode } from "../types";
import { cleanText } from '../utils/textCleaner';
import {
  AI_PROVIDER,
  AI_TEMPERATURE,
  OPENROUTER_API_BASE,
  OPENROUTER_MODEL,
  GEMINI_TEXT_MODEL,
  GEMINI_IMAGE_MODEL,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_VOICE,
  IMAGE_GENERATION_ENABLED,
  TTS_ENABLED
} from "../constants/config";

// ============ 类型定义 ============
export type AIProvider = 'openrouter' | 'gemini';

// ============ OpenRouter API Key ============
const getOpenRouterApiKey = (): string | undefined => {
  // @ts-ignore - Vite injects env vars
  return import.meta.env?.VITE_OPENROUTER_API_KEY;
};

// ============ 批量生成的系统提示词 ============
const BATCH_SYSTEM_INSTRUCTION = `
你是一个日式视觉小说（Galgame）的剧情引擎。
你的任务是生成一段完整的对话序列（15-40轮对话），以及对话结束后玩家可以做出的选择。

角色和设定会在用户消息中提供。

【文本质量要求 - 极其重要】
1. 严禁缺主语！每句对话必须主语明确（如"她看着我..."而不是"看着我..."）。
2. 严禁重复同一句话，每轮对话内容必须不同。
3. 严禁出现重复字错误（如"樱飞飞"）。
4. 断句要自然，符合中文语境，不要过度使用短句。
5. 描写要细腻，结合环境和动作描写（Narrative）。

【对话节奏要求】
1. dialogueSequence 必须包含 15-40 轮连续对话，确保剧情充分展开。
2. 对话要有起承转合，推进故事发展，不要流水账。
3. 角色对话要符合性格。
4. 表情必须与对话情感匹配。
5. 如果剧情框架中提供了【抉择时刻】的具体选项，必须优先使用那些选项！否则生成2-3个合理的推进选项。

【表情选项】
neutral(平静) | happy(开心) | sad(难过) | angry(生气) | blush(害羞) | surprised(惊讶) | shy(羞涩) | fear(害怕)

【背景选项 - 根据对话场景选择最合适的】
现代场景: school_rooftop(天台) | classroom(教室) | school_gate(校门) | school_corridor(走廊) | library(图书馆) | street_sunset(街道黄昏) | riverside(河边) | convenience_store(便利店) | cafe(咖啡厅) | park_night(公园夜景) | train_station(车站) | bedroom(卧室)
奇幻王国: palace_hall(王宫大厅) | palace_garden(宫廷花园) | palace_balcony(宫殿阳台) | castle_corridor(城堡走廊) | royal_bedroom(皇家卧室) | training_ground(训练场) | abandoned_garden(废弃花园)

输出严格的 JSON 格式：
{
  "narrative": "一段详细的场景描述，包含环境、光影和人物状态",
  "background": "根据场景选择上述背景之一",
  "bgm": "daily|happy|sad|tense|romantic|mysterious",
  "dialogueSequence": [
    {"speaker": "角色名|你|旁白", "dialogue": "完整句子", "expression": "表情"}
  ],
  "affectionChange": 0,
  "isGameOver": false,
  "choices": [{"text": "选项文本", "sentiment": "positive|neutral|negative"}]
}
`;

// ============ 选择分支生成的提示词 ============
const BRANCH_SYSTEM_INSTRUCTION = `
你是一个日式视觉小说的剧情引擎。
玩家刚刚做出了一个选择，你需要生成该选择后的对话序列（15-40轮）。

【文本质量要求】
1. 严禁缺主语！句子结构必须完整。
2. 描写细腻，多用动作和心理描写辅助对话。
3. 符合角色性格。

【对话规则】
1. 延续玩家选择，体现选择的影响（如果选择了拥抱，必须描写拥抱的细节）。
2. dialogueSequence 长度控制在 15-40 轮。
3. 根据剧情发展选择合适的背景场景。
4. 结束时提供下一阶段的选项（如果剧情框架有定义，请遵循）。

【背景选项】
同上。

输出JSON格式同上。
`;

// ============ 系统提示词 (旧版/备用) ============
const SYSTEM_INSTRUCTION = `
你是一个日式视觉小说（Galgame）的引擎。
女主角是"雯曦"，一个暗恋玩家的傲娇青梅竹马。
背景是现代日本高中环境。

你的目标是根据用户的选择推进故事。
隐藏管理"好感度"分数。好感度高时她会变得甜蜜，低时会变得冷淡。

重要：所有 narrative、dialogue 和 choices 文本必须使用简体中文。
JSON 对象中的键（如 speaker、expression）保持英文，但 speaker 的值可以是"雯曦"、"你"或"旁白"。

输出严格的 JSON 格式。
可用背景：school_rooftop, classroom, street_sunset, cafe, park_night, bedroom
可用表情：neutral, happy, sad, angry, blush, surprised
可用 BGM 氛围：daily, happy, sad, tense, romantic, mysterious

规则：
1. narrative 是场景描述（不显示在对话框中）
2. speaker 应该是"雯曦"、"你"或"旁白"
3. dialogue 是说的话，保持简洁（2句以内）
4. affectionChange 是上一个用户选择导致的整数变化（-5 到 +5）
5. 提供 2-3 个不同的中文选项
6. 选择与场景氛围匹配的 bgm
7. 如果故事自然结束或玩家严重破坏关系，设置 isGameOver 为 true
`;

// ============ Gemini 实现 ============
let geminiAI: any = null;
let geminiChat: any = null;

const initGemini = async () => {
  if (!geminiAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not found");
    
    const { GoogleGenAI } = await import("@google/genai");
    geminiAI = new GoogleGenAI({ apiKey });
  }
  return geminiAI;
};

const geminiGenerateText = async (userMessage: string, isNewGame: boolean): Promise<SceneData> => {
  const ai = await initGemini();
  const { Type } = await import("@google/genai");

  if (isNewGame || !geminiChat) {
    const schema = {
      type: Type.OBJECT,
      properties: {
        narrative: { type: Type.STRING },
        speaker: { type: Type.STRING },
        dialogue: { type: Type.STRING },
        expression: { type: Type.STRING, enum: Object.values(CharacterExpression) },
        background: { type: Type.STRING, enum: Object.values(BackgroundType) },
        bgm: { type: Type.STRING, enum: Object.values(BgmMood) },
        choices: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] }
            },
            required: ['text', 'sentiment']
          }
        },
        affectionChange: { type: Type.INTEGER },
        isGameOver: { type: Type.BOOLEAN }
      },
      required: ['narrative', 'speaker', 'dialogue', 'expression', 'background', 'bgm', 'choices', 'affectionChange', 'isGameOver']
    };

    geminiChat = ai.chats.create({
      model: GEMINI_TEXT_MODEL,
      config: {
        systemInstruction: customSystemInstruction || SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: AI_TEMPERATURE,
      },
    });
  }

  const response = await geminiChat.sendMessage({ message: userMessage });
  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text) as SceneData;
};

const geminiGenerateImage = async (expression: string): Promise<string | null> => {
  if (!IMAGE_GENERATION_ENABLED) return null;
  
  try {
    const ai = await initGemini();
    
    // 使用当前角色信息生成提示
    const characterName = currentCharacterInfo?.name || '雯曦';
    const characterPersonality = currentCharacterInfo?.personality || '温柔可爱的日本女高中生';
    const characterSetting = currentCharacterInfo?.setting || '现代日本高中';
    
    // 根据角色设定生成外观描述
    let appearanceDescription = '';
    if (characterName === '艾琳娜') {
      appearanceDescription = 'a beautiful European princess with long blonde hair and blue eyes, wearing an elegant medieval royal dress with golden decorations';
    } else if (characterName === '柳如烟') {
      appearanceDescription = 'a beautiful ancient Chinese courtesan with long black hair styled in traditional elegance, wearing an exquisite hanfu with silk embroidery and flowing sleeves';
    } else {
      appearanceDescription = 'a beautiful Japanese high school girl with long straight black hair with bangs, purple eyes, wearing a classic navy blue sailor high school uniform with a red ribbon';
    }
    
    const prompt = `
      A full body visual novel character sprite of ${appearanceDescription}.
      Character name: ${characterName}, personality: ${characterPersonality}, setting: ${characterSetting}.
      She is facing the camera directly.
      Facial Expression: ${expression}.
      The background must be solid white.
      Art style: High quality anime, cel shaded, vibrant colors, masterpiece, clean lines, 2d game asset.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '9:16' } }
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Gemini image generation failed:", e);
    return null;
  }
};

const geminiGenerateSpeech = async (text: string): Promise<string | null> => {
  if (!TTS_ENABLED) return null;
  
  try {
    const ai = await initGemini();
    const { Modality } = await import("@google/genai");
    
    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    console.error("Gemini TTS failed:", e);
    return null;
  }
};

// ============ 统一导出接口 ============
export const startNewGame = async (): Promise<SceneData> => {
  const message = AI_PROVIDER === 'gemini'
    ? "Start the game. It is after school. I meet Aiko on the rooftop. She looks like she has something to say. (Please generate the output in Simplified Chinese)"
    : "开始游戏。放学后，我在天台遇到了雯曦。她看起来有话要说。请生成第一个场景的 JSON。";
  
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateText(message, true);
  } else {
    throw new Error("Single turn generation not supported for OpenRouter");
  }
};

export const makeChoice = async (choiceText: string): Promise<SceneData> => {
  const message = AI_PROVIDER === 'gemini'
    ? `Player chose: "${choiceText}". Continue the story.`
    : `玩家选择了："${choiceText}"。继续故事。`;
  
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateText(message, false);
  } else {
    throw new Error("Single turn generation not supported for OpenRouter");
  }
};

export const generateCharacterImage = async (expression: string): Promise<string | null> => {
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateImage(expression);
  } else {
    return null;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateSpeech(text);
  } else {
    return null;
  }
};

// 获取当前使用的提供商
export const getCurrentProvider = (): AIProvider => AI_PROVIDER;

// 生成剧情框架
export const generatePlotFramework = async (prompt: string): Promise<string> => {
  if (AI_PROVIDER === 'gemini') {
    const ai = await initGemini();
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { temperature: AI_TEMPERATURE }
    });
    return response.text || '生成失败，请重试';
  } else {
    throw new Error("Plot framework generation not supported for OpenRouter yet");
  }
};

// 存储自定义系统指令
let customSystemInstruction: string | null = null;

// 存储当前角色信息用于图像生成
let currentCharacterInfo: {
  name: string;
  personality: string;
  setting: string;
} | null = null;

// 设置自定义剧本
export const setCustomScript = (
  characterName: string,
  personality: string,
  setting: string,
  plotFramework: string
) => {
  // 存储角色信息用于图像生成
  currentCharacterInfo = {
    name: characterName,
    personality,
    setting
  };
  
  customSystemInstruction = `
你是一个日式视觉小说的引擎。
角色名称：${characterName}
角色性格：${personality}
故事背景：${setting}
剧情框架：${plotFramework}

你的目标是根据用户的选择推进故事。隐藏管理"好感度"分数。

重要：所有文本使用简体中文。输出严格的 JSON 格式。
可用背景（根据场景选择最合适的）：
现代场景: school_rooftop, classroom, school_gate, school_corridor, library, street_sunset, riverside, convenience_store, cafe, park_night, train_station, bedroom
奇幻王国: palace_hall, palace_garden, palace_balcony, castle_corridor, royal_bedroom, training_ground, abandoned_garden
可用表情：neutral, happy, sad, angry, blush, surprised, shy, fear
可用 BGM 氛围：daily, happy, sad, tense, romantic, mysterious

规则：
1. narrative 是场景描述，需要细腻的环境和动作描写
2. speaker 应该是"${characterName}"、"你"或"旁白"
3. dialogue 必须是完整句子，严禁缺主语，严禁重复
4. affectionChange 范围 -5 到 +5
5. 提供 2-3 个选项（如果剧情框架有指定，必须优先使用）
6. 如果故事结束，设置 isGameOver 为 true
7. 每次生成 15-40 轮对话，确保剧情充分展开
`;
  // 重置聊天历史确保新剧本使用正确的系统指令
  geminiChat = null;
};

// 重置为默认剧本
export const resetToDefaultScript = () => {
  customSystemInstruction = null;
  currentCharacterInfo = null;
  geminiChat = null;
};

// 预加载下一场景（用于缓冲）
export const prefetchNextScene = async (possibleChoices: string[]): Promise<Map<string, SceneData>> => {
  const results = new Map<string, SceneData>();
  
  // 只预加载第一个选项以节省API调用
  if (possibleChoices.length > 0) {
    try {
      const scene = await makeChoice(possibleChoices[0]);
      results.set(possibleChoices[0], scene);
    } catch (e) {
      console.error('Prefetch failed:', e);
    }
  }
  
  return results;
};

// 生成CG图片
export const generateCGImage = async (prompt: string): Promise<string | null> => {
  const fullPrompt = `
    A beautiful high-quality anime illustration, CG art style.
    ${prompt}
    Style: Detailed anime art, vibrant colors, dramatic lighting, masterpiece quality.
  `;
  
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateImage(fullPrompt);
  } else {
    return null;
  }
};

// ============ 批量对话生成系统 ============

/**
 * 清理批量对话数据中的所有文本 - 返回全新的深拷贝对象
 */
export const cleanBatchDialogueData = (data: BatchSceneData): BatchSceneData => {
  // 创建深拷贝以避免修改原始数据
  return {
    ...data,
    narrative: data.narrative ? cleanText(data.narrative) : data.narrative,
    dialogueSequence: data.dialogueSequence?.map(node => ({
      ...node,
      dialogue: cleanText(node.dialogue)
    })) || [],
    choices: data.choices?.map(choice => ({
      ...choice,
      text: cleanText(choice.text)
    })) || []
  };
};

// 批量对话的聊天历史（独立于单轮对话）
let batchChatHistory: { role: string; content: string }[] = [];

/**
 * 生成批量对话序列（游戏开始或选择后）
 */
export const generateBatchDialogue = async (
  context: string,
  isNewGame: boolean = false
): Promise<BatchSceneData> => {
  // 根据AI提供商选择相应的生成函数
  if (AI_PROVIDER === 'openrouter') {
    return openrouterGenerateBatchDialogue(context, isNewGame);
  } else if (AI_PROVIDER === 'gemini') {
    return geminiGenerateBatchDialogue(context, isNewGame);
  } else {
    throw new Error(`Unsupported AI Provider: ${AI_PROVIDER}`);
  }
};

// ============ OpenRouter 批量对话生成 (Gemini 2.5 Flash) ============
const openrouterGenerateBatchDialogue = async (
  context: string,
  isNewGame: boolean = false
): Promise<BatchSceneData> => {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not found");

  if (isNewGame) {
    batchChatHistory = [];
  }

  // 构建系统消息
  let systemContent = customSystemInstruction 
    ? customSystemInstruction.replace(
        '规则：\n1. narrative 是场景描述',
        `规则：
1. 生成 15-40 轮连续对话序列（dialogueSequence），模拟真实对话节奏
2. 对话必须有主语，严禁重复，有起承转合
3. narrative 是场景描述`
      )
    : BATCH_SYSTEM_INSTRUCTION;

  const messages = [
    { role: 'system', content: systemContent },
    ...batchChatHistory,
    { role: 'user', content: context }
  ];

  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Novel Game'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: AI_TEMPERATURE,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices?.[0]?.message?.content;
  
  if (!assistantMessage) throw new Error("Empty response from OpenRouter");

  // 更新历史
  batchChatHistory.push({ role: 'user', content: context });
  batchChatHistory.push({ role: 'assistant', content: assistantMessage });

  // 限制历史长度
  if (batchChatHistory.length > 20) {
    batchChatHistory = batchChatHistory.slice(-16);
  }

  // 解析 JSON
  let parsedData: BatchSceneData;
  try {
    parsedData = JSON.parse(assistantMessage);
  } catch (e) {
    console.error('Failed to parse JSON:', assistantMessage);
    throw new Error("Failed to parse JSON response from OpenRouter");
  }

  // 验证数据结构
  if (!parsedData.dialogueSequence || !Array.isArray(parsedData.dialogueSequence)) {
    throw new Error("Invalid dialogueSequence in response");
  }
  
  // 验证并记录choices
  if (!parsedData.choices || !Array.isArray(parsedData.choices) || parsedData.choices.length === 0) {
    console.warn('[OpenRouter] 响应缺少choices，添加默认选项');
    parsedData.choices = [
      { text: "继续聊天", sentiment: "positive" },
      { text: "保持沉默", sentiment: "neutral" },
      { text: "转移话题", sentiment: "neutral" }
    ];
  }
  
  console.log(`[OpenRouter] 生成了 ${parsedData.dialogueSequence.length} 轮对话和 ${parsedData.choices.length} 个选项`);

  // 清理文本数据
  return cleanBatchDialogueData(parsedData);
};

// ============ Gemini 批量对话生成 ============
const geminiGenerateBatchDialogue = async (
  context: string,
  isNewGame: boolean = false
): Promise<BatchSceneData> => {
  const ai = await initGemini();
  const { Type } = await import("@google/genai");

  if (isNewGame) {
    batchChatHistory = [];
  }

  // 构建系统消息
  let systemContent = customSystemInstruction 
    ? customSystemInstruction.replace(
        '规则：\n1. narrative 是场景描述',
        `规则：
1. 生成 15-40 轮连续对话序列（dialogueSequence），模拟真实对话节奏
2. 对话必须有主语，严禁重复，有起承转合
3. narrative 是场景描述`
      )
    : BATCH_SYSTEM_INSTRUCTION;

  // 定义批量对话的 schema
  const batchSchema = {
    type: Type.OBJECT,
    properties: {
      narrative: { type: Type.STRING },
      background: { type: Type.STRING },
      bgm: { type: Type.STRING },
      dialogueSequence: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: { type: Type.STRING },
            dialogue: { type: Type.STRING },
            expression: { type: Type.STRING }
          },
          required: ['speaker', 'dialogue', 'expression']
        }
      },
      affectionChange: { type: Type.INTEGER },
      isGameOver: { type: Type.BOOLEAN },
      choices: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            sentiment: { type: Type.STRING }
          },
          required: ['text', 'sentiment']
        }
      }
    },
    required: ['narrative', 'background', 'bgm', 'dialogueSequence', 'affectionChange', 'isGameOver', 'choices']
  };

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: { parts: [{ text: systemContent + '\n\n' + context }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: batchSchema,
      temperature: AI_TEMPERATURE,
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  
  // 更新历史
  batchChatHistory.push({ role: 'user', content: context });
  batchChatHistory.push({ role: 'assistant', content: text });

  // 限制历史长度
  if (batchChatHistory.length > 20) {
    batchChatHistory = batchChatHistory.slice(-16);
  }

  const parsedData = JSON.parse(text) as BatchSceneData;

  // 验证数据结构
  if (!parsedData.dialogueSequence || !Array.isArray(parsedData.dialogueSequence)) {
    throw new Error("Invalid dialogueSequence in response");
  }

  // 清理文本数据
  return cleanBatchDialogueData(parsedData);
};

/**
 * 为特定选择生成后续对话
 */
export const generateBranchDialogue = async (
  choiceText: string,
  choiceSentiment: string
): Promise<BatchSceneData> => {
  const characterName = currentCharacterInfo?.name || '雯曦';
  
  // 根据情感倾向生成不同的反应提示
  let reactionHint = '';
  if (choiceSentiment === 'positive') {
    reactionHint = `${characterName}对这个选择感到开心，态度会更加亲近和温柔。`;
  } else if (choiceSentiment === 'negative') {
    reactionHint = `${characterName}对这个选择感到不满或失望，态度会变得冷淡或生气。`;
  } else {
    reactionHint = `${characterName}保持平常态度，但内心可能有些波动。`;
  }

  const context = `【玩家做出选择】

玩家选择了："${choiceText}"
情感倾向：${choiceSentiment}

${reactionHint}

【要求】
1. 生成15-40轮自然的对话序列
2. 每句对话必须完整，主语明确，使用流畅的简体中文
3. 对话要体现选择的影响和角色反应
4. 表情要与对话情感相匹配
5. 推进故事发展，增加角色互动
6. 结束时必须根据剧情框架提供2-3个新的选择（如果有定义）

请生成后续对话。`;

  return generateBatchDialogue(context, false);
};

/**
 * 预加载所有选择分支（后台调用）
 */
export const preloadAllBranches = async (
  choices: { text: string; sentiment: string }[],
  onBranchLoaded?: (choiceText: string, data: BatchSceneData) => void
): Promise<Map<string, BatchSceneData>> => {
  const results = new Map<string, BatchSceneData>();
  
  // 并行加载所有分支
  const promises = choices.map(async (choice) => {
    try {
      const data = await generateBranchDialogue(choice.text, choice.sentiment);
      results.set(choice.text, data);
      onBranchLoaded?.(choice.text, data);
    } catch (e) {
      console.error(`Failed to preload branch "${choice.text}":`, e);
    }
  });

  await Promise.all(promises);
  return results;
};

/**
 * 开始新游戏（批量版本）
 */
export const startNewGameBatch = async (): Promise<BatchSceneData> => {
  const characterName = currentCharacterInfo?.name || '雯曦';
  const personality = currentCharacterInfo?.personality || '傲娇的青梅竹马';
  const setting = currentCharacterInfo?.setting || '现代日本高中，樱花盛开的春天';
  
  const context = `【开始新游戏】

角色：${characterName}
性格：${personality}  
场景：${setting}

故事开端：放学后的天台，${characterName}独自一人站在那里，望着远方渐渐西沉的夕阳。微风轻轻吹动她的长发，她似乎陷入了沉思。当她注意到你的到来时，神色变得有些复杂。

【要求】
1. 生成15-40轮精彩的开场对话序列
2. 每句对话必须完整，主语明确，使用流畅的简体中文
3. 对话要体现角色性格特点
4. 建立起角色之间的关系和故事氛围
5. 表情要与对话内容相匹配
6. 对话结束后提供3个有意义的选择

请开始生成开场对话。`;

  return generateBatchDialogue(context, true);
};

/**
 * 重置批量对话历史
 */
export const resetBatchHistory = () => {
  batchChatHistory = [];
};

/**
 * 生成完整剧情框架
 * 根据角色设定生成详细的故事大纲（约5000字，包含8-10个章节）
 */
export const generateFullPlot = async (
  characterName: string,
  personality: string,
  appearance: string,
  relationship: string,
  setting: string,
  onProgress?: (status: string) => void
): Promise<string> => {
  onProgress?.('正在生成剧情框架...');
  
  const prompt = `你是一个专业的视觉小说剧本作家。请根据以下角色设定，创作一个完整的恋爱故事剧情框架。

【角色设定】
- 角色名称：${characterName}
- 性格特点：${personality}
- 外貌描写：${appearance}
- 与主角关系：${relationship}
- 故事背景：${setting}

【创作要求】
1. 创作一个完整的恋爱故事，包含 8-10 个章节
2. 每个章节约 400-600 字，总计约 4000-5000 字
3. 故事结构要包含：序章（初遇）、发展（误会/冲突）、高潮（危机/转折）、终章（告白/HE）
4. 每个章节要有明确的场景、情感发展和关键事件
5. 在关键章节末尾标注【抉择时刻】，提供 2-3 个选择分支，影响后续剧情走向
6. 对话要符合角色性格，情感描写要细腻真实
7. 结合环境描写和动作描写，增强画面感

【输出格式】
【序章：标题】
正文内容...

【第一章：标题】
正文内容...
【抉择时刻】
选项1：xxx
选项2：xxx
选项3：xxx

...以此类推

请开始创作：`;

  try {
    if (AI_PROVIDER === 'gemini') {
      return await geminiGenerateFullPlot(prompt, onProgress);
    } else {
      return await openRouterGenerateFullPlot(prompt, onProgress);
    }
  } catch (error) {
    console.error('生成剧情框架失败:', error);
    throw error;
  }
};

// Gemini 生成完整剧情
async function geminiGenerateFullPlot(prompt: string, onProgress?: (status: string) => void): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('未配置 GEMINI_API_KEY');
  }

  onProgress?.('正在调用 Gemini API...');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API 错误: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  onProgress?.('剧情生成完成！');
  return text;
}

// OpenRouter 生成完整剧情
async function openRouterGenerateFullPlot(prompt: string, onProgress?: (status: string) => void): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('未配置 OpenRouter API Key');
  }

  onProgress?.('正在调用 OpenRouter API...');
  
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Visual Novel'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API 错误: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  onProgress?.('剧情生成完成！');
  return text;
}

