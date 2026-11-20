// Procedural sound only: every effect is an oscillator or filtered noise made by WebAudio,
// so the game ships no audio files. Audio starts on the first user gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, duration, type, volume) {
    if (!ensure() || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function noise(duration, volume, filterFreq) {
    if (!ensure() || muted) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1800;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.3;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  let sirenPhase = 0;
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    engine(speed01, driving) {
      if (!ensure() || muted) return;
      const target = driving ? 0.05 + speed01 * 0.09 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.1);
    },
    siren(on, dt) {
      if (!ensure() || muted) return;
      sirenPhase += dt;
      const target = on ? 0.05 : 0;
      sirenGain.gain.setTargetAtTime(target, ctx.currentTime, 0.2);
      sirenOsc.frequency.value = 620 + 180 * Math.sin(sirenPhase * 4.4);
    },
    shot() { noise(0.14, 0.4, 2400); },
    punch() { noise(0.08, 0.25, 900); },
    pickup() { blip(880, 0.12, 'sine', 0.25); blip(1320, 0.18, 'sine', 0.2); },
    cash() { blip(1046, 0.1, 'triangle', 0.25); blip(1568, 0.16, 'triangle', 0.22); },
    crash() { noise(0.25, 0.35, 700); },
    busted() { blip(220, 0.5, 'sawtooth', 0.3); blip(165, 0.7, 'sawtooth', 0.3); },
    mission() { blip(523, 0.12, 'triangle', 0.25); blip(659, 0.12, 'triangle', 0.25); blip(784, 0.25, 'triangle', 0.25); },
  };
}
