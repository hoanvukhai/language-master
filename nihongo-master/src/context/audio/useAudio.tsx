import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as synth from '../../lib/audio/synthesizer';

type SfxType = 'correct' | 'wrong' | 'countdownTick' | 'countdownGo' | 'gameover' | 'ticktock' | 'combo' | 'victory';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playSfx: (type: SfxType) => void;
  playBgm: (type: 'lobby' | 'racing') => void;
  stopBgm: () => void;
  playText: (text: string, lang?: string) => void;
}

const AudioContext = createContext<AudioContextType>({
  isMuted: false,
  toggleMute: () => {},
  playSfx: () => {},
  playBgm: () => {},
  stopBgm: () => {},
  playText: () => {},
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nihongo_audio_muted') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('nihongo_audio_muted', String(isMuted));
    if (isMuted) {
      synth.stopAllBgm();
    }
  }, [isMuted]);

  const toggleMute = () => setIsMuted(prev => !prev);

  const playSfx = (type: SfxType) => {
    if (isMuted) return;
    switch (type) {
      case 'correct': synth.playCorrectSound(); break;
      case 'wrong': synth.playWrongSound(); break;
      case 'countdownTick': synth.playCountdownTick(); break;
      case 'countdownGo': synth.playCountdownGo(); break;
      case 'gameover': synth.playGameOverSound(); break;
      case 'victory': synth.playVictorySound(); break;
      case 'combo': synth.playComboSound(); break;
      case 'ticktock': synth.playTick(); break;
    }
  };

  const playBgm = (type: 'lobby' | 'racing') => {
    if (isMuted) return;
    if (type === 'lobby') synth.startLobbyBgm();
    else if (type === 'racing') synth.startRacingBgm();
  };

  const stopBgm = () => {
    synth.stopAllBgm();
  };

  const playText = (text: string, lang: string = 'ja-JP') => {
    if (isMuted) return;
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, playSfx, playBgm, stopBgm, playText }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
