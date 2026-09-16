let context: AudioContext | undefined;
let enabled = false;
export function setFeedbackEnabled(value: boolean) {
  enabled = value;
  if (value) {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  }
}
export function playFeedback(kind: 'move' | 'dice') {
  if (!enabled) return;
  navigator.vibrate?.(kind === 'move' ? 12 : [12, 30, 12]);
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.setValueAtTime(kind === 'move' ? 420 : 220, context.currentTime);
  gain.gain.setValueAtTime(0.06, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
}
