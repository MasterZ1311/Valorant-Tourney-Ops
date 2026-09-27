/**
 * VALORANT Tactical Sound System
 * Manages tactile audio feedback for tournament operators and match marshals.
 */

let soundEnabled = true;

export function isAudioEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("vto_sound_enabled");
  if (saved !== null) {
    soundEnabled = saved === "true";
  }
  return soundEnabled;
}

export function toggleAudio(): boolean {
  if (typeof window === "undefined") return false;
  soundEnabled = !soundEnabled;
  localStorage.setItem("vto_sound_enabled", String(soundEnabled));
  if (soundEnabled) {
    playButtonClick();
  }
  return soundEnabled;
}

function playAudioFile(path: string, volume = 0.5) {
  if (typeof window === "undefined" || !isAudioEnabled()) return;
  try {
    const audio = new Audio(path);
    audio.volume = volume;
    audio.play().catch(() => {
      // Browsers may block audio before first user interaction
    });
  } catch {
    // Graceful fallback if audio is unsupported
  }
}

export function playButtonClick() {
  playAudioFile("/sounds/button_click.mp3", 0.4);
}

export function playMatchStart() {
  playAudioFile("/sounds/match_start.mp3", 0.6);
}

export function playTechPause() {
  playAudioFile("/sounds/tech_pause.mp3", 0.7);
}

export const soundFX = {
  playClick: playButtonClick,
  playMatchStart,
  playTechPause,
};
