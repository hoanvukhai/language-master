// src/lib/audio/synthesizer.ts

let audioCtx: AudioContext | null = null;
let lobbyInterval: ReturnType<typeof setInterval> | null = null;
let racingInterval: ReturnType<typeof setInterval> | null = null;
let activeBgmRequest = 0;

export function ensureAudioContext(): Promise<void> {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    return audioCtx.resume();
  }
  return Promise.resolve();
}

function createMasterGain(ctx: AudioContext): GainNode {
  const master = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-16, ctx.currentTime);
  compressor.ratio.setValueAtTime(12, ctx.currentTime);
  master.connect(compressor);
  compressor.connect(ctx.destination);
  return master;
}

export function playCorrectSound() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const now = audioCtx.currentTime;

    const correctNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const stepDelay = 0.045;

    correctNotes.forEach((freq, index) => {
      const noteTime = now + index * stepDelay;
      const isFinalNote = index === correctNotes.length - 1;
      const duration = isFinalNote ? 0.4 : 0.2;

      const osc1 = audioCtx!.createOscillator();
      const gain1 = audioCtx!.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, noteTime);
      gain1.gain.setValueAtTime(0, noteTime);
      gain1.gain.linearRampToValueAtTime(0.6, noteTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);
      osc1.connect(gain1); gain1.connect(master);
      osc1.start(noteTime); osc1.stop(noteTime + duration);

      const osc2 = audioCtx!.createOscillator();
      const gain2 = audioCtx!.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, noteTime);
      gain2.gain.setValueAtTime(0, noteTime);
      gain2.gain.linearRampToValueAtTime(0.3, noteTime + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);
      osc2.connect(gain2); gain2.connect(master);
      osc2.start(noteTime); osc2.stop(noteTime + duration);
    });
  });
}

export function playWrongSound() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const now = audioCtx.currentTime;

    const wrongNotes = [
      { f: 220.00, d: 0.12, t: 0.0 },
      { f: 164.81, d: 0.12, t: 0.08 },
      { f: 130.81, d: 0.15, t: 0.16 },
      { f: 98.00, d: 0.25, t: 0.24 }
    ];

    wrongNotes.forEach((note) => {
      const noteTime = now + note.t;

      const osc1 = audioCtx!.createOscillator();
      const gain1 = audioCtx!.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(note.f, noteTime);
      gain1.gain.setValueAtTime(0.6, noteTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, noteTime + note.d);
      osc1.connect(gain1); gain1.connect(master);
      osc1.start(noteTime); osc1.stop(noteTime + note.d);

      const osc2 = audioCtx!.createOscillator();
      const gain2 = audioCtx!.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(note.f, noteTime);
      gain2.gain.setValueAtTime(0.3, noteTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, noteTime + note.d);
      osc2.connect(gain2); gain2.connect(master);
      osc2.start(noteTime); osc2.stop(noteTime + note.d);
    });
  });
}

export function playCountdownTick() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    gain.gain.setValueAtTime(1.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain); gain.connect(master);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  });
}

export function playCountdownGo() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(1.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    osc.connect(gain); gain.connect(master);
    osc.start(); osc.stop(audioCtx.currentTime + 0.45);
  });
}

export function playGameOverSound() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const notes = [{ f: 493.88, d: 0.15 }, { f: 466.16, d: 0.15 }, { f: 440.00, d: 0.15 }, { f: 349.23, d: 0.5 }];
    let startTime = audioCtx.currentTime;
    notes.forEach((note) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, startTime);
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);
      osc.connect(gain); gain.connect(master);
      osc.start(startTime); osc.stop(startTime + note.d);
      startTime += note.d * 0.85;
    });
  });
}

export function playVictorySound() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const notes = [{ f: 523.25, d: 0.1 }, { f: 659.25, d: 0.1 }, { f: 783.99, d: 0.1 }, { f: 1046.50, d: 0.4 }];
    let startTime = audioCtx.currentTime;
    notes.forEach((note) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, startTime);
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.d);
      osc.connect(gain); gain.connect(master);
      osc.start(startTime); osc.stop(startTime + note.d);
      startTime += note.d * 0.8;
    });
  });
}

export function playComboSound() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const now = audioCtx.currentTime;

    const sweepOsc = audioCtx.createOscillator();
    const sweepGain = audioCtx.createGain();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(200, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(1600, now + 0.35);
    sweepGain.gain.setValueAtTime(0.5, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    sweepOsc.connect(sweepGain); sweepGain.connect(master);
    sweepOsc.start(now); sweepOsc.stop(now + 0.35);

    const comboNotes = [1046.50, 1318.51, 1567.98];
    comboNotes.forEach((freq, index) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'triangle';
      const noteTime = now + 0.18 + index * 0.08;
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.5, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);
      osc.connect(gain); gain.connect(master);
      osc.start(noteTime); osc.stop(noteTime + 0.12);
    });
  });
}

// Chẻ nhỏ hàm playPanic5sSingleSpeed thành playTick (Chỉ kêu 1 tiếng duy nhất)
let tickToggle = false;
export function playTick() {
  ensureAudioContext().then(() => {
    if (!audioCtx) return;
    const master = createMasterGain(audioCtx);
    const now = audioCtx.currentTime;
    
    // Toggle frequency to create tick-tock effect (High-Low)
    const freq = tickToggle ? 880 : 554.37;
    tickToggle = !tickToggle;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + 0.04);
  });
}

export function stopAllBgm() {
  activeBgmRequest = 0; // Hủy các request đang chờ AudioContext resume
  if (lobbyInterval) { clearInterval(lobbyInterval); lobbyInterval = null; }
  if (racingInterval) { clearInterval(racingInterval); racingInterval = null; }
}

export function startLobbyBgm() {
  const reqId = Date.now();
  activeBgmRequest = reqId;

  ensureAudioContext().then(() => {
    // Nếu request bị hủy trong lúc chờ user tương tác (ví dụ đã chuyển sang Racing)
    if (activeBgmRequest !== reqId) return;

    if (lobbyInterval) stopAllBgm();
    if (!audioCtx) return;
    
    const master = createMasterGain(audioCtx);
    const chords = [
      { bass: 130.81, triad: [261.63, 329.63, 392.00, 493.88] },
      { bass: 110.00, triad: [220.00, 261.63, 329.63, 392.00] },
      { bass: 146.83, triad: [293.66, 349.23, 440.00, 523.25] },
      { bass: 98.00, triad: [196.00, 246.94, 293.66, 349.23] }
    ];
    let step = 0;

    lobbyInterval = setInterval(() => {
      if (!audioCtx) return;
      const currentChord = chords[step % chords.length];
      const now = audioCtx.currentTime;

      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(currentChord.bass, now);
      bassGain.gain.setValueAtTime(0.2, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      bassOsc.connect(bassGain); bassGain.connect(master);
      bassOsc.start(now); bassOsc.stop(now + 1.2);

      currentChord.triad.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.1, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);
        osc.connect(gain); gain.connect(master);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.8);
      });

      step++;
    }, 1400);
  });
}

export function startRacingBgm() {
  const reqId = Date.now();
  activeBgmRequest = reqId;

  ensureAudioContext().then(() => {
    if (activeBgmRequest !== reqId) return;

    if (racingInterval) stopAllBgm();
    if (!audioCtx) return;

    const master = createMasterGain(audioCtx);
    const chords = [
      { bass: 130.81, notes: [261.63, 329.63, 392.00, 523.25] },
      { bass: 110.00, notes: [220.00, 329.63, 392.00, 659.25] },
      { bass: 146.83, notes: [293.66, 349.23, 440.00, 587.33] },
      { bass: 196.00, notes: [196.00, 246.94, 392.00, 493.88] }
    ];
    let step = 0;

    racingInterval = setInterval(() => {
      if (!audioCtx) return;
      const currentChord = chords[Math.floor(step / 2) % chords.length];
      const now = audioCtx.currentTime;

      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(currentChord.bass, now);
      bassGain.gain.setValueAtTime(0.25, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      bassOsc.connect(bassGain); bassGain.connect(master);
      bassOsc.start(now); bassOsc.stop(now + 0.35);

      const noteFreq = currentChord.notes[step % currentChord.notes.length];
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now + 0.28);

      step++;
    }, 320);
  });
}
