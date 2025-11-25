/**
 * 统一 AI 服务
 * 支持多个提供商：Gemini (Google) 和 DashScope (阿里云)
 * 通过配置切换
 */

import { SceneData, CharacterExpression, BackgroundType, BgmMood } from "../types";
import {
  AI_PROVIDER,
  AI_TEMPERATURE,
  // Gemini 配置
  GEMINI_TEXT_MODEL,
  GEMINI_IMAGE_MODEL,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_VOICE,
  // DashScope 配置
  DASHSCOPE_TEXT_MODEL,
  DASHSCOPE_IMAGE_MODEL,
  COSY_VOICE_MODEL,
  COSY_VOICE_NAME,
  // 功能开关
  IMAGE_GENERATION_ENABLED,
  TTS_ENABLED
} from "../constants/config";

// ============ 类型定义 ============
export type AIProvider = 'gemini' | 'dashscope';

// ============ 系统提示词 ============
const SYSTEM_INSTRUCTION = `
你是一个日式视觉小说（Galgame）的引擎。
女主角是"爱子"，一个暗恋玩家的傲娇青梅竹马。
背景是现代日本高中环境。

你的目标是根据用户的选择推进故事。
隐藏管理"好感度"分数。好感度高时她会变得甜蜜，低时会变得冷淡。

重要：所有 narrative、dialogue 和 choices 文本必须使用简体中文。
JSON 对象中的键（如 speaker、expression）保持英文，但 speaker 的值可以是"爱子"、"你"或"旁白"。

输出严格的 JSON 格式。
可用背景：school_rooftop, classroom, street_sunset, cafe, park_night, bedroom
可用表情：neutral, happy, sad, angry, blush, surprised
可用 BGM 氛围：daily, happy, sad, tense, romantic, mysterious

规则：
1. narrative 是场景描述（不显示在对话框中）
2. speaker 应该是"爱子"、"你"或"旁白"
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
        systemInstruction: SYSTEM_INSTRUCTION,
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
    const prompt = `
      A full body visual novel character sprite of a beautiful Japanese high school girl named Aiko.
      She has long straight black hair with bangs, purple eyes, and is wearing a classic navy blue sailor high school uniform with a red ribbon.
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

// ============ DashScope 实现 ============
// 开发环境使用代理，生产环境需要后端
const DASHSCOPE_API_BASE = '/dashscope-api';
let dashscopeChatHistory: Array<{ role: string; content: string }> = [];

const getDashScopeApiKey = (): string | null => {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key || key === 'your-dashscope-api-key') return null;
  return key;
};

const dashscopeGenerateText = async (userMessage: string, isNewGame: boolean): Promise<SceneData> => {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY not found");

  if (isNewGame) {
    dashscopeChatHistory = [];
  }

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...dashscopeChatHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/text-generation/generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DASHSCOPE_TEXT_MODEL,
      input: { messages },
      parameters: { temperature: AI_TEMPERATURE, result_format: 'message' }
    })
  });

  if (!response.ok) {
    throw new Error(`DashScope API error: ${response.status}`);
  }

  const data = await response.json();
  const assistantMessage = data.output?.choices?.[0]?.message?.content;
  
  if (!assistantMessage) throw new Error("Empty response from DashScope");

  dashscopeChatHistory.push({ role: 'user', content: userMessage });
  dashscopeChatHistory.push({ role: 'assistant', content: assistantMessage });

  // 解析 JSON（可能被包裹在 markdown 代码块中）
  let jsonStr = assistantMessage;
  const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  
  const parsed = JSON.parse(jsonStr);
  
  // 修复 characters 数组格式：取第一个角色对话
  if (parsed.characters && Array.isArray(parsed.characters) && parsed.characters.length > 0) {
    const firstChar = parsed.characters.find((c: any) => c.speaker === '爱子') || parsed.characters[0];
    parsed.speaker = firstChar.speaker || '???';
    parsed.dialogue = firstChar.dialogue || '...';
    parsed.expression = firstChar.expression || 'neutral';
  }
  
  // 修复 dialogueSequence 格式：取第一个对话
  if (parsed.dialogueSequence && Array.isArray(parsed.dialogueSequence) && parsed.dialogueSequence.length > 0) {
    const firstDialogue = parsed.dialogueSequence.find((d: any) => d.speaker === '爱子') || parsed.dialogueSequence[0];
    parsed.speaker = firstDialogue.speaker || parsed.speaker || '???';
    parsed.dialogue = firstDialogue.dialogue || parsed.dialogue || '...';
    parsed.expression = firstDialogue.expression || parsed.expression || 'neutral';
  }
  
  // 确保必要字段存在
  parsed.speaker = parsed.speaker || '???';
  parsed.dialogue = parsed.dialogue || '...';
  parsed.expression = parsed.expression || 'neutral';
  parsed.background = parsed.background || 'school_rooftop';
  parsed.bgm = parsed.bgm || 'daily';
  parsed.affectionChange = parsed.affectionChange || 0;
  parsed.isGameOver = parsed.isGameOver || false;
  
  // 修复 choices 格式：提取 text，移除嵌套的 next 对象
  if (parsed.choices) {
    parsed.choices = parsed.choices.map((choice: any) => {
      // 根据 next 里的 affectionChange 判断 sentiment
      let sentiment = 'neutral';
      if (choice.sentiment) {
        sentiment = choice.sentiment;
      } else if (choice.value !== undefined) {
        sentiment = choice.value > 0 ? 'positive' : choice.value < 0 ? 'negative' : 'neutral';
      } else if (choice.next?.affectionChange !== undefined) {
        sentiment = choice.next.affectionChange > 0 ? 'positive' : choice.next.affectionChange < 0 ? 'negative' : 'neutral';
      }
      return { text: choice.text, sentiment };
    });
  }
  
  return parsed as SceneData;
};

const dashscopeGenerateImage = async (expression: string): Promise<string | null> => {
  if (!IMAGE_GENERATION_ENABLED) return null;
  
  const apiKey = getDashScopeApiKey();
  if (!apiKey) return null;

  const prompt = `
    一个美丽的日本高中女生角色立绘，名叫爱子。
    她有长直黑发和刘海，紫色眼睛，穿着经典的深蓝色水手服校服配红色蝴蝶结。
    她正面面对镜头。面部表情：${expression}。
    背景必须是纯白色。
    艺术风格：高质量动漫，赛璐珞着色，鲜艳色彩，杰作，干净线条，2D游戏素材。
  `;

  try {
    // 提交异步任务
    const submitResponse = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify({
        model: DASHSCOPE_IMAGE_MODEL,
        input: { prompt },
        parameters: { size: '768*1152', n: 1 }
      })
    });

    if (!submitResponse.ok) return null;

    const submitData = await submitResponse.json();
    const taskId = submitData.output?.task_id;
    if (!taskId) return null;

    // 轮询任务状态
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`${DASHSCOPE_API_BASE}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.output?.task_status;

      if (status === 'SUCCEEDED') {
        return statusData.output?.results?.[0]?.url || null;
      } else if (status === 'FAILED') {
        return null;
      }
    }
    return null;
  } catch (e) {
    console.error("DashScope image generation error:", e);
    return null;
  }
};

// CosyVoice WebSocket TTS 实现
const dashscopeGenerateSpeech = async (text: string): Promise<string | null> => {
  if (!TTS_ENABLED) return null;
  
  const apiKey = getDashScopeApiKey();
  if (!apiKey) return null;

  return new Promise((resolve) => {
    // 使用 Vite 代理的 WebSocket URL（代理会添加 Authorization header）
    const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/dashscope-ws`;
    const taskId = crypto.randomUUID().replace(/-/g, '');
    const audioChunks: ArrayBuffer[] = [];
    const pendingChunks: Promise<void>[] = [];  // 跟踪异步处理的音频块

    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      console.warn('CosyVoice TTS timeout');
      ws.close();
      resolve(null);
    }, 30000);

    ws.onopen = () => {
      // 发送 run-task 指令
      const runTask = {
        header: {
          action: 'run-task',
          task_id: taskId,
          streaming: 'duplex'
        },
        payload: {
          task_group: 'audio',
          task: 'tts',
          function: 'SpeechSynthesizer',
          model: COSY_VOICE_MODEL,
          parameters: {
            text_type: 'PlainText',
            voice: COSY_VOICE_NAME,
            format: 'mp3',
            sample_rate: 22050,
            volume: 50,
            rate: 1,
            pitch: 1
          },
          input: {}
        }
      };
      ws.send(JSON.stringify(runTask));
    };

    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // 二进制音频数据
        const chunkPromise = event.data.arrayBuffer().then(buffer => {
          audioChunks.push(buffer);
        });
        pendingChunks.push(chunkPromise);
      } else {
        // JSON 事件
        const data = JSON.parse(event.data);
        const eventType = data.header?.event;

        if (eventType === 'task-started') {
          // 发送 continue-task 指令（包含文本）
          const continueTask = {
            header: {
              action: 'continue-task',
              task_id: taskId,
              streaming: 'duplex'
            },
            payload: {
              input: { text }
            }
          };
          ws.send(JSON.stringify(continueTask));

          // 发送 finish-task 指令
          const finishTask = {
            header: {
              action: 'finish-task',
              task_id: taskId,
              streaming: 'duplex'
            },
            payload: {
              input: {}
            }
          };
          ws.send(JSON.stringify(finishTask));
        } else if (eventType === 'task-finished') {
          clearTimeout(timeout);
          ws.close();
          // 等待所有音频数据块处理完成，然后合并
          Promise.all(pendingChunks).then(() => {
            if (audioChunks.length > 0) {
              const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
              const combined = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunk of audioChunks) {
                combined.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
              }
              const blob = new Blob([combined], { type: 'audio/mp3' });
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              resolve(null);
            }
          });
        } else if (eventType === 'task-failed') {
          console.error('CosyVoice TTS failed:', data.header?.error_message);
          clearTimeout(timeout);
          ws.close();
          resolve(null);
        }
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
};

// ============ 统一导出接口 ============
export const startNewGame = async (): Promise<SceneData> => {
  const message = AI_PROVIDER === 'gemini'
    ? "Start the game. It is after school. I meet Aiko on the rooftop. She looks like she has something to say. (Please generate the output in Simplified Chinese)"
    : "开始游戏。放学后，我在天台遇到了爱子。她看起来有话要说。请生成第一个场景的 JSON。";
  
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateText(message, true);
  } else {
    return dashscopeGenerateText(message, true);
  }
};

export const makeChoice = async (choiceText: string): Promise<SceneData> => {
  const message = AI_PROVIDER === 'gemini'
    ? `Player chose: "${choiceText}". Continue the story.`
    : `玩家选择了："${choiceText}"。继续故事。`;
  
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateText(message, false);
  } else {
    return dashscopeGenerateText(message, false);
  }
};

export const generateCharacterImage = async (expression: string): Promise<string | null> => {
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateImage(expression);
  } else {
    return dashscopeGenerateImage(expression);
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (AI_PROVIDER === 'gemini') {
    return geminiGenerateSpeech(text);
  } else {
    return dashscopeGenerateSpeech(text);
  }
};

// 获取当前使用的提供商
export const getCurrentProvider = (): AIProvider => AI_PROVIDER;
