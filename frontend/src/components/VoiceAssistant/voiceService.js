// Voice Service: Browser Speech Recognition (STT) and Speech Synthesis (TTS)
// Supports English (en-IN), Telugu (te-IN), and Hindi (hi-IN)

class VoiceService {
  constructor() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    this.SpeechRecognition = SpeechRecognition;
    this.recognition = null;
    this.isListeningActive = false;
    this.voices = [];
    this.voicesLoaded = false;
    this.isMuted = false;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.voices = window.speechSynthesis.getVoices() || [];
    this.voicesLoaded = this.voices.length > 0;
  }

  isRecognitionSupported() {
    return !!this.SpeechRecognition;
  }

  isSynthesisSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  getBestVoice(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this.initVoices();
    }

    const langLower = (langCode || "en").toLowerCase();

    if (langLower.startsWith("te")) {
      // Find Telugu voice
      const teVoice = this.voices.find(
        (v) =>
          v.lang.toLowerCase().includes("te") ||
          v.name.toLowerCase().includes("telugu")
      );
      if (teVoice) return teVoice;
    } else if (langLower.startsWith("hi")) {
      // Find Hindi voice
      const hiVoice = this.voices.find(
        (v) =>
          v.lang.toLowerCase().includes("hi") ||
          v.name.toLowerCase().includes("hindi") ||
          v.name.toLowerCase().includes("swara") ||
          v.name.toLowerCase().includes("madhur")
      );
      if (hiVoice) return hiVoice;
    } else {
      // Find Indian English or default English voice
      const enInVoice = this.voices.find(
        (v) =>
          v.lang.toLowerCase().includes("en-in") ||
          v.name.toLowerCase().includes("india")
      );
      if (enInVoice) return enInVoice;

      const enVoice = this.voices.find((v) =>
        v.lang.toLowerCase().startsWith("en")
      );
      if (enVoice) return enVoice;
    }

    return null;
  }

  startListening({ lang = "en-IN", onResult, onError, onStart, onEnd }) {
    if (!this.isRecognitionSupported()) {
      if (onError) onError({ error: "not-supported" });
      return;
    }

    // If already running, stop previous session first
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore abort error
      }
    }

    try {
      this.recognition = new this.SpeechRecognition();
      this.recognition.lang = lang;
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      let finalTranscript = "";

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        if (onStart) onStart();
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (onResult) {
          onResult({
            text: currentText.trim(),
            isFinal: !!finalTranscript,
          });
        }
      };

      this.recognition.onerror = (event) => {
        this.isListeningActive = false;
        if (onError) onError(event);
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        if (onEnd) onEnd(finalTranscript.trim());
      };

      this.recognition.start();
    } catch (err) {
      this.isListeningActive = false;
      if (onError) onError(err);
    }
  }

  stopListening() {
    if (this.recognition && this.isListeningActive) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListeningActive = false;
  }

  speak(text, { lang = "en-IN", onStart, onEnd } = {}) {
    if (!this.isSynthesisSupported() || this.isMuted || !text) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // cancel any active utterance

      // Clean formatted symbols for natural speech (e.g. ₹50,000 -> 50000 rupees)
      const speechText = text
        .replace(/₹\s*/g, lang.startsWith("te") ? " రూపాయలు " : lang.startsWith("hi") ? " रुपये " : " rupees ")
        .replace(/[#*]/g, "")
        .trim();

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voice = this.getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS speak exception:", err);
      if (onEnd) onEnd();
    }
  }

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stopSpeaking();
    }
  }
}

export const voiceService = new VoiceService();
