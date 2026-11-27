export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

/**
 * Pluggable TTS Provider interface.
 * MVP ships with WebSpeechTTSProvider (free, zero-config, offline-capable).
 * Future providers (Azure TTS, OpenAI TTS, VOICEVOX) only need to implement this interface.
 */
export interface TTSProvider {
  readonly name: string;
  isSupported(): boolean;
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
}

class WebSpeechTTSProvider implements TTSProvider {
  readonly name = 'Web Speech API (ja-JP)';

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private pickJapaneseVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Prefer natural Japanese voices when available
    const jaVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ja'));
    if (!jaVoices.length) return null;

    const preferred =
      jaVoices.find((v) => /nanami|haruka|kyoko|otoya|google 日本語/i.test(v.name)) ?? jaVoices[0];
    return preferred;
  }

  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported() || !text.trim()) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang ?? 'ja-JP';
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      const voice = this.pickJapaneseVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

let activeProvider: TTSProvider = new WebSpeechTTSProvider();

export function getTTSProvider(): TTSProvider {
  return activeProvider;
}

/**
 * Swap the active TTS implementation at runtime (e.g., Azure / OpenAI / VOICEVOX).
 */
export function setTTSProvider(provider: TTSProvider): void {
  activeProvider.stop();
  activeProvider = provider;
}
