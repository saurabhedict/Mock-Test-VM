import { useEffect, useRef, useState } from "react";

type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResult = { isFinal: boolean; 0: SpeechRecognitionResultItem };
type SpeechRecognitionEvent = { resultIndex: number; results: ArrayLike<SpeechRecognitionResult> };
type SpeechRecognitionErrorEvent = { error?: string };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const useSpeechToText = (onTranscript: (text: string) => void) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const SpeechRecognitionApi =
    typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    if (!SpeechRecognitionApi) {
      return false;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let finalTranscript = "";
        const nextInterimTranscript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => !result.isFinal)
        .map((result) => result[0]?.transcript?.trim() || "")
        .filter(Boolean)
        .join(" ")
        .trim();

      Array.from(event.results)
        .slice(event.resultIndex)
        .filter((result) => result.isFinal)
        .forEach((result) => {
          const transcript = result[0]?.transcript?.trim() || "";
          if (transcript) finalTranscript = `${finalTranscript} ${transcript}`.trim();
        });

      // Throttle interim transcript updates to ~10fps to avoid layout thrashing
      window.requestAnimationFrame(() => {
        setInterimTranscript(nextInterimTranscript);
      });

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterimTranscript("");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    return true;
  };

  return {
    supported: Boolean(SpeechRecognitionApi),
    listening,
    interimTranscript,
    startListening,
    stopListening,
  };
};
