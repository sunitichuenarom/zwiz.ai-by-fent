let context: AudioContext | undefined;

export function unlockSound(): void {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
}

export function playNotificationSound(): void {
  if (!context || context.state !== "running") return;
  const audio = context;
  const start = audio.currentTime;

  [880, 1175].forEach((frequency, index) => {
    const at = start + index * 0.15;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.3);
  });
}
