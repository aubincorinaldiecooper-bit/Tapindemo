/**
 * Game sounds, made in the browser with the Web Audio API (no audio files to load).
 * The on/off choice is saved; sound is on by default.
 */
import * as React from "react";

const KEY = "tile-rush-sound";

function readSaved(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

let enabled = readSaved();
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browsers keep audio suspended until the player has interacted; a swap always follows a tap or drag.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not saved; the choice still applies for this visit.
  }
}

/** A short soft "pop": a quick falling tone, a little different each time so repeats don't grate. */
export function playMove() {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  const base = 440 + Math.random() * 90;

  const tone = audio.createOscillator();
  const gain = audio.createGain();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(base * 1.5, now);
  tone.frequency.exponentialRampToValueAtTime(base * 0.8, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  tone.connect(gain).connect(audio.destination);
  tone.start(now);
  tone.stop(now + 0.14);
}

/** A bright two-note "ding" for a tile landing in its right spot. */
export function playPlaced() {
  if (!enabled) return;
  const audio = context();
  if (!audio) return;
  const now = audio.currentTime;
  [
    { freq: 784, at: 0 },
    { freq: 1175, at: 0.085 },
  ].forEach(({ freq, at }) => {
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(freq, now + at);
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(0.15, now + at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.28);
    tone.connect(gain).connect(audio.destination);
    tone.start(now + at);
    tone.stop(now + at + 0.3);
  });
}

/** Sound on/off for the settings screen. */
export function useSound(): [boolean, () => void] {
  const [on, setOn] = React.useState(enabled);
  const toggle = React.useCallback(() => {
    setOn((current) => {
      setSoundEnabled(!current);
      // Confirm with a pop when turning it on.
      if (!current) playMove();
      return !current;
    });
  }, []);
  return [on, toggle];
}
