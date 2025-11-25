import { BgmMood } from '../types';
import { BGM_VOLUME, VOICE_VOLUME, VOICE_SAMPLE_RATE } from '../constants/config';

// Extend Window interface for webkit prefix
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Using public domain/CC0 audio links.
const BGM_URLS: Record<BgmMood, string> = {
  [BgmMood.DAILY]: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112778.mp3',
  [BgmMood.HAPPY]: 'https://cdn.pixabay.com/download/audio/2024/09/16/audio_4123547f6d.mp3?filename=happy-day-240507.mp3',
  [BgmMood.SAD]: 'https://cdn.pixabay.com/download/audio/2021/11/24/audio_8233772213.mp3?filename=sad-piano-111555.mp3',
  [BgmMood.TENSE]: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_51cc6c8104.mp3?filename=suspense-108253.mp3',
  [BgmMood.ROMANTIC]: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_fc8c857701.mp3?filename=romantic-piano-110753.mp3',
  [BgmMood.MYSTERIOUS]: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_5d2b378051.mp3?filename=mystery-124317.mp3',
};

// Helper to decode base64 to Uint8Array
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM to AudioBuffer
async function decodeRawPCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert int16 to float [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private bgmElement: HTMLAudioElement | null = null;
  private currentMood: BgmMood | null = null;
  private isMuted: boolean = false;
  private currentVoiceSource: AudioBufferSourceNode | null = null;
  private currentVoiceElement: HTMLAudioElement | null = null;

  async init() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: VOICE_SAMPLE_RATE });
    }
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playBgm(mood: BgmMood) {
    if (this.currentMood === mood) return;
    this.currentMood = mood;

    if (this.bgmElement) {
        this.bgmElement.pause();
        this.bgmElement.currentTime = 0;
    }

    const url = BGM_URLS[mood];
    if (!url) return;

    this.bgmElement = new Audio(url);
    this.bgmElement.loop = true;
    this.bgmElement.volume = this.isMuted ? 0 : BGM_VOLUME;
    
    const playPromise = this.bgmElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("BGM autoplay was prevented:", error);
        });
    }
  }

  playSfx(type: 'type' | 'click' | 'hover' | 'start' | 'next') {
    if (this.isMuted || !this.audioContext) return;

    try {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        if (type === 'type') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'start') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.8);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
        } else if (type === 'next') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {
        console.error("AudioContext error", e);
    }
  }

  async playVoice(audioData: string) {
    if (this.isMuted || !audioData) return;

    // Stop previous voice if playing
    this.stopVoice();

    try {
      // 判断是 URL 还是 base64
      if (audioData.startsWith('http://') || audioData.startsWith('https://') || audioData.startsWith('blob:')) {
        // 播放 URL 音频 (MP3) - 包括 blob URL
        this.currentVoiceElement = new Audio(audioData);
        this.currentVoiceElement.volume = VOICE_VOLUME;
        await this.currentVoiceElement.play();
      } else if (audioData.startsWith('data:')) {
        // 播放 data URL
        this.currentVoiceElement = new Audio(audioData);
        this.currentVoiceElement.volume = VOICE_VOLUME;
        await this.currentVoiceElement.play();
      } else {
        // 播放 raw PCM base64 (旧的 Gemini TTS 格式)
        if (!this.audioContext) return;
        const bytes = decodeBase64(audioData);
        const buffer = await decodeRawPCM(bytes, this.audioContext, VOICE_SAMPLE_RATE);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = VOICE_VOLUME;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start();
        this.currentVoiceSource = source;
      }
    } catch (e) {
      console.error("Failed to play voice:", e);
    }
  }

  stopVoice() {
    if (this.currentVoiceSource) {
      try { this.currentVoiceSource.stop(); } catch(e) {}
      this.currentVoiceSource = null;
    }
    if (this.currentVoiceElement) {
      this.currentVoiceElement.pause();
      this.currentVoiceElement.currentTime = 0;
      this.currentVoiceElement = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgmElement) {
        this.bgmElement.volume = this.isMuted ? 0 : BGM_VOLUME;
    }
    // Also stop voice if muting
    if (this.isMuted) {
      this.stopVoice();
    }
    return this.isMuted;
  }
}

export const audioService = new AudioService();