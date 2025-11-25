export enum CharacterExpression {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  BLUSH = 'blush',
  SURPRISED = 'surprised',
}

export enum BackgroundType {
  SCHOOL_ROOFTOP = 'school_rooftop',
  CLASSROOM = 'classroom',
  STREET_SUNSET = 'street_sunset',
  CAFE = 'cafe',
  PARK_NIGHT = 'park_night',
  BEDROOM = 'bedroom',
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
}