import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../api";
import BillModal from "../BillModal";
import { voiceService } from "./voiceService";
import { parseVoiceCommand } from "./nlpParser";
import { executeVoiceIntent, fetchProductsList } from "./commandExecutor";
import { LANGUAGES, UI_STRINGS, getMessage } from "./translations";
import "./VoiceAssistant.css";

export default function VoiceAssistant() {
  const navigate = useNavigate();

  // Persistent language preference
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("voice_assistant_lang") || "en";
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Transcript / Chat messages: Array of { sender: 'user' | 'assistant', text: string, time: string }
  const [messages, setMessages] = useState([
    {
      sender: "assistant",
      text: "Hello! I am your Smart Inventory Voice Assistant. Speak or type a command to manage products, sales, purchases, reports, or navigate.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [context, setContext] = useState({});
  const [knownProducts, setKnownProducts] = useState([]);
  const [activeBill, setActiveBill] = useState(null);

  const isRecognitionSupported = voiceService.isRecognitionSupported();
  const chatBottomRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, interimText, isProcessing]);

  // Load known products whenever opened or updated
  const refreshProducts = async () => {
    if (getToken()) {
      const prods = await fetchProductsList();
      setKnownProducts(prods);
    }
  };

  useEffect(() => {
    refreshProducts();
    const handleUpdate = () => refreshProducts();
    window.addEventListener("inventory-updated", handleUpdate);
    return () => {
      window.removeEventListener("inventory-updated", handleUpdate);
    };
  }, []);

  // Save language changes
  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("voice_assistant_lang", newLang);
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    voiceService.setMuted(nextMute);
  };

  // Process a text command (from speech or typing)
  const processCommand = async (commandText) => {
    if (!commandText || !commandText.trim()) return;
    const cleanText = commandText.trim();

    // Check auth
    if (!getToken()) {
      const authMsg = UI_STRINGS[lang]?.loginRequired || "Please log in first.";
      addMessage("user", cleanText);
      addMessage("assistant", authMsg);
      voiceService.speak(authMsg, { lang: getSpeechLang(lang) });
      return;
    }

    addMessage("user", cleanText);
    // NOTE: the typed text stays visible in the input while the command is
    // being processed. It is cleared in the finally block below (and only if
    // the user has not already started typing something new).
    setInterimText("");
    setIsProcessing(true);

    try {
      // 1. Parse intent
      const parsedIntent = parseVoiceCommand(cleanText, context, knownProducts);

      // 2. Execute intent
      const responseText = await executeVoiceIntent({
        parsedIntent,
        context,
        setContext,
        lang,
        navigate,
        onShowBill: (bill) => setActiveBill(bill),
      });

      addMessage("assistant", responseText);

      // 3. Text to Speech
      if (!isMuted) {
        setIsSpeaking(true);
        voiceService.speak(responseText, {
          lang: getSpeechLang(lang),
          onEnd: () => setIsSpeaking(false),
        });
      }
    } catch (err) {
      console.error("Voice processing error:", err);
      const errMsg = getMessage("notUnderstood", lang);
      addMessage("assistant", errMsg);
      if (!isMuted) {
        voiceService.speak(errMsg, { lang: getSpeechLang(lang) });
      }
    } finally {
      // Clear the input only if it still holds the submitted command —
      // never wipe text the user has typed since submission.
      setInputText((current) =>
        current === commandText || current === cleanText ? "" : current
      );
      setIsProcessing(false);
    }
  };

  const getSpeechLang = (langCode) => {
    const found = LANGUAGES.find((l) => l.code === langCode);
    return found ? found.speechLang : "en-IN";
  };

  const addMessage = (sender, text) => {
    setMessages((prev) => [
      ...prev,
      {
        sender,
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Track whether onResult already handled the final transcript so onEnd
  // never re-submits the same command (double-execution bug).
  const commandSubmittedRef = useRef(false);

  // Mic toggle handler
  const handleMicClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    }

    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }

    if (!isRecognitionSupported) {
      return;
    }

    commandSubmittedRef.current = false;
    setIsListening(true);
    setInterimText("");

    voiceService.startListening({
      lang: getSpeechLang(lang),
      onStart: () => {
        setIsListening(true);
      },
      onResult: ({ text, isFinal }) => {
        // Show live speech in the interim bubble
        setInterimText(text);
        if (isFinal && text) {
          commandSubmittedRef.current = true;
          setIsListening(false);
          setInterimText("");
          processCommand(text);
        }
      },
      onError: (err) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
        setInterimText("");
      },
      onEnd: (finalText) => {
        setIsListening(false);
        // Only process here if onResult did NOT already handle the final
        // transcript (e.g. when recognition ends without a final event).
        if (finalText && !commandSubmittedRef.current) {
          commandSubmittedRef.current = true;
          processCommand(finalText);
        }
        setInterimText("");
      },
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      processCommand(inputText);
    }
  };

  const ui = UI_STRINGS[lang] || UI_STRINGS.en;

  return (
    <>
      {/* FLOATING ACTION MIC BUTTON */}
      <div className="voice-assistant-fab-container">
        <button
          type="button"
          className={`voice-assistant-fab ${isListening ? "listening" : ""} ${
            isOpen ? "active" : ""
          }`}
          onClick={handleMicClick}
          title={ui.micTooltip}
          aria-label={ui.micTooltip}
        >
          {isListening ? (
            <div className="voice-waves">
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
              <span className="wave-bar"></span>
            </div>
          ) : (
            <svg
              className="fab-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
          {isListening && <span className="fab-pulse-ring"></span>}
        </button>
      </div>

      {/* VOICE ASSISTANT POPUP / DRAWER */}
      {isOpen && (
        <div className="voice-assistant-window" role="dialog" aria-label={ui.title}>
          {/* HEADER */}
          <div className="va-header">
            <div className="va-title-box">
              <span className="va-icon">🎙️</span>
              <div>
                <h3 className="va-title">{ui.title}</h3>
                <span className="va-status">
                  {isListening
                    ? ui.listening
                    : isProcessing
                    ? ui.processing
                    : isSpeaking
                    ? ui.speaking
                    : ui.idle}
                </span>
              </div>
            </div>

            <div className="va-actions">
              {/* LANGUAGE SELECTOR */}
              <div className="va-lang-picker">
                <select
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="va-lang-select"
                  aria-label="Select Assistant Language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* MUTE / UNMUTE */}
              <button
                type="button"
                className="va-btn-icon"
                onClick={handleToggleMute}
                title={isMuted ? ui.unmute : ui.mute}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>

              {/* CLOSE */}
              <button
                type="button"
                className="va-btn-icon"
                onClick={() => {
                  voiceService.stopListening();
                  voiceService.stopSpeaking();
                  setIsListening(false);
                  setIsSpeaking(false);
                  setIsOpen(false);
                }}
                title={ui.close}
              >
                ✕
              </button>
            </div>
          </div>

          {/* UNSUPPORTED BROWSER NOTICE */}
          {!isRecognitionSupported && (
            <div className="va-unsupported-banner">
              ⚠️ <strong>{ui.notSupportedTitle}:</strong> {ui.notSupportedMsg}
            </div>
          )}

          {/* CHAT MESSAGES */}
          <div className="va-body">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`va-message-row ${
                  m.sender === "user" ? "user-row" : "assistant-row"
                }`}
              >
                <div className={`va-bubble ${m.sender}`}>
                  <div className="va-bubble-meta">
                    <strong>{m.sender === "user" ? ui.you : ui.assistant}</strong>
                    <span className="va-time">{m.time}</span>
                  </div>
                  <div className="va-bubble-text">{m.text}</div>
                </div>
              </div>
            ))}

            {/* Interim live speech recognition bubble */}
            {isListening && interimText && (
              <div className="va-message-row user-row interim">
                <div className="va-bubble user interim-bubble">
                  <div className="va-bubble-meta">
                    <strong>{ui.you}</strong>
                    <span className="va-time">...</span>
                  </div>
                  <div className="va-bubble-text">{interimText}</div>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="va-message-row assistant-row">
                <div className="va-bubble assistant loading">
                  <div className="va-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* QUICK SUGGESTIONS */}
          <div className="va-suggestions">
            <span className="va-suggestions-label">{ui.suggestionsTitle}</span>
            <div className="va-suggestions-list">
              {ui.suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  className="va-chip"
                  onClick={() => processCommand(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM */}
          <form className="va-footer" onSubmit={handleFormSubmit}>
            <input
              type="text"
              className="va-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={ui.typePlaceholder}
            />

            <button
              type="button"
              className={`va-mic-btn ${isListening ? "listening" : ""}`}
              onClick={handleMicClick}
              title={isListening ? "Stop Listening" : "Start Listening"}
            >
              🎤
            </button>

            <button
              type="submit"
              className="va-send-btn"
              disabled={!inputText.trim()}
            >
              {ui.send}
            </button>
          </form>
        </div>
      )}

      {/* SALES / PURCHASE BILL MODAL POPUP IF GENERATED */}
      {activeBill && (
        <BillModal bill={activeBill} onClose={() => setActiveBill(null)} />
      )}
    </>
  );
}
