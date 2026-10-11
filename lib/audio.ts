'use client';
let context: AudioContext | undefined;
export function unlockAudio() {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
}
function note(
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const time = context.currentTime + start;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + duration);
}
export function sound(kind: 'play' | 'turn' | 'escape' | 'lose' | 'music') {
  if (kind === 'play') note(280, 0, 0.12, 0.045, 'triangle');
  if (kind === 'turn') {
    note(659, 0, 0.3, 0.05);
    note(880, 0.12, 0.4, 0.04);
  }
  if (kind === 'escape') [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.5, 0.035));
  if (kind === 'lose')
    [392, 370, 349, 262].forEach((f, i) => note(f, i * 0.22, 0.4, 0.04, 'triangle'));
  if (kind === 'music')
    [130.81, 164.81, 196, 261.63].forEach((f, i) => note(f, i * 0.6, 3.8, 0.009));
}
