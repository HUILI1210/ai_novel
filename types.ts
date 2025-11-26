export enum CharacterExpression {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  BLUSH = 'blush',
  SURPRISED = 'surprised',
}

export enum BackgroundType {
  // 现代校园场景
  SCHOOL_ROOFTOP = 'school_rooftop',
  CLASSROOM = 'classroom',
  SCHOOL_GATE = 'school_gate',
  SCHOOL_CORRIDOR = 'school_corridor',
  LIBRARY = 'library',
  STREET_SUNSET = 'street_sunset',
  RIVERSIDE = 'riverside',
  CONVENIENCE_STORE = 'convenience_store',
  CAFE = 'cafe',
  PARK_NIGHT = 'park_night',
  TRAIN_STATION = 'train_station',
  BEDROOM = 'bedroom',
  // 奇幻王国场景
  PALACE_HALL = 'palace_hall',
  PALACE_GARDEN = 'palace_garden',
  PALACE_BALCONY = 'palace_balcony',
  CASTLE_CORRIDOR = 'castle_corridor',
  ROYAL_BEDROOM = 'royal_bedroom',
  TRAINING_GROUND = 'training_ground',
}

export enum BgmMood {
  DAILY = 'daily',
  HAPPY = 'happy',
  SAD = 'sad',
  TENSE = 'tense',
  ROMANTIC = 'romantic',
  MYSTERIOUS = 'mysterious',
}

export interface GameChoice {
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface SceneData {
  narrative: string; // Descriptive text for the log/context
  speaker: string; // Who is talking (Character Name or "You" or "Narrator")
  dialogue: string; // What is being said
  expression: CharacterExpression;
  background: BackgroundType;
  bgm: BgmMood; // Background music mood
  choices: GameChoice[];
  affectionChange: number; // How much the previous choice affected the relationship
  isGameOver: boolean;
}

export interface GameState {
  currentScene: SceneData | null;
  history: SceneData[];
  affection: number;
  isLoading: boolean;
  gameStarted: boolean;
  turn: number;
  isPaused: boolean;
  dialogueOpacity: number;
  prefetchedScene: SceneData | null;
  prefetchedImage: string | null;
}

export interface CharacterConfig {
  name: string;
  personality: string;
  appearance: string;
  relationship: string;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  plotFramework: string;
  character: CharacterConfig;
  setting: string;
  createdAt: number;
  updatedAt: number;
}

export interface CGScene {
  id: string;
  triggerCondition: string;
  imagePrompt: string;
  imageUrl?: string;
  title: string;
  description: string;
}

export interface DialogueSegment {
  speaker: string;
  dialogue: string;
  expression: CharacterExpression;
}

export interface ExtendedSceneData extends SceneData {
  dialogueSequence?: DialogueSegment[];
  cgTrigger?: string;
  cgImageUrl?: string;
}

// ============ 剧情缓冲系统类型 ============

/** 单个对话节点 */
export interface DialogueNode {
  speaker: string;
  dialogue: string;
  expression: CharacterExpression;
  background?: BackgroundType;
  bgm?: BgmMood;
  narrative?: string;
}

/** 选择分支（包含该选择后的完整对话序列） */
export interface ChoiceBranch {
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  affectionChange: number;
  dialogueSequence: DialogueNode[]; // 该选择后的多轮对话
  nextChoices?: GameChoice[];       // 对话序列结束后的下一组选择
  isGameOver?: boolean;
}

/** 缓冲的剧情数据 */
export interface BufferedStory {
  /** 当前正在播放的对话序列 */
  currentSequence: DialogueNode[];
  /** 当前播放到第几个对话 (0-based) */
  currentIndex: number;
  /** 当前序列的初始背景 */
  background: BackgroundType;
  /** 当前序列的初始BGM */
  bgm: BgmMood;
  /** 预缓冲的选择分支（包含后续对话） */
  bufferedChoices: ChoiceBranch[];
  /** 是否正在后台预加载 */
  isPreloading: boolean;
  /** 预加载进度 (0-3，表示已缓冲的分支数) */
  preloadProgress: number;
}

/** AI 生成的批量剧情数据 */
export interface BatchSceneData {
  /** 初始场景描述 */
  narrative: string;
  /** 初始背景 */
  background: BackgroundType;
  /** 初始BGM */
  bgm: BgmMood;
  /** 对话序列 (最多10轮) */
  dialogueSequence: DialogueNode[];
  /** 好感度变化 */
  affectionChange: number;
  /** 是否游戏结束 */
  isGameOver: boolean;
  /** 对话结束后的选择 */
  choices: GameChoice[];
}