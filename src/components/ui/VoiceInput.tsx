import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
  language?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Web Speech API types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function VoiceInput({
  onTranscript,
  onInterimTranscript,
  disabled = false,
  language = 'si-LK', // Sinhala by default
  size = 'md',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser');
    }
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      finalTranscriptRef.current = '';
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      
      // Send final transcript if any
      if (finalTranscriptRef.current.trim()) {
        onTranscript(finalTranscriptRef.current.trim());
        finalTranscriptRef.current = '';
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setInterimText('');
      
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('No microphone found. Please check your device.');
          break;
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone access.');
          break;
        case 'network':
          setError('Network error. Please check your connection.');
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
      }

      setInterimText(interim);
      if (onInterimTranscript) {
        onInterimTranscript(finalTranscriptRef.current + interim);
      }
    };

    return recognition;
  }, [language, onTranscript, onInterimTranscript]);

  const startListening = useCallback(() => {
    if (!isSupported || disabled) return;

    // Stop existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setError('Failed to start voice recognition');
      }
    }
  }, [isSupported, disabled, initRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="relative group">
        <button
          disabled
          className={`${sizeClasses[size]} flex items-center justify-center rounded-xl
            bg-gray-200 dark:bg-gray-700 cursor-not-allowed
            text-gray-400 dark:text-gray-500`}
          aria-label="Voice input not supported"
        >
          <MicOff size={iconSizes[size]} />
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
          text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100
          transition-opacity whitespace-nowrap pointer-events-none">
          Voice input not supported
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={toggleListening}
        disabled={disabled}
        className={`${sizeClasses[size]} flex items-center justify-center rounded-xl
          transition-all duration-200 relative overflow-hidden
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          border border-gray-200 dark:border-white/10`}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        {/* Pulsing ring animation when listening */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-xl bg-red-500"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                className="absolute inset-0 rounded-xl bg-red-500"
              />
            </>
          )}
        </AnimatePresence>

        <motion.div
          animate={isListening ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
          className="relative z-10"
        >
          {isListening ? (
            <Mic size={iconSizes[size]} />
          ) : (
            <Mic size={iconSizes[size]} />
          )}
        </motion.div>
      </motion.button>

      {/* Interim transcript indicator */}
      <AnimatePresence>
        {interimText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
              bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg
              max-w-[200px] truncate shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="truncate">{interimText}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
              bg-red-500 text-white text-xs rounded-lg shadow-lg whitespace-nowrap"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
