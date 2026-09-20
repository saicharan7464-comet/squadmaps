/**
 * Voice guidance service using Web Speech API for spoken turn-by-turn maneuvers
 */
class VoiceGuidanceService {
  private isMuted = false;
  private lastSpokenText = '';
  private lastSpokenTime = 0;

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  isVoiceMuted(): boolean {
    return this.isMuted;
  }

  speak(text: string, force = false) {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const now = Date.now();
    // Prevent repeating identical announcement within 8 seconds unless forced
    if (!force && text === this.lastSpokenText && now - this.lastSpokenTime < 8000) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    window.speechSynthesis.cancel(); // Cancel previous ongoing utterance

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

export const voiceGuidance = new VoiceGuidanceService();
