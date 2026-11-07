/** Kleine Kadenz: Figuren klingen wie Musik. Noten stehen auf dem Ton, der klingt. */
const HARMONY = [
  { melodyHz: 293.66, melodyKey: "d/4", bassHz: 116.54 }, // B-Dur
  { melodyHz: 392.0, melodyKey: "g/4", bassHz: 155.56 }, // Es-Dur, Es bräuchte ein Vorzeichen
  { melodyHz: 261.63, melodyKey: "c/4", bassHz: 174.61 }, // F-Dur
  { melodyHz: 293.66, melodyKey: "d/4", bassHz: 116.54 },
] as const;

export function harmonyAt(index: number): (typeof HARMONY)[number] {
  return HARMONY[index % HARMONY.length]!;
}

/** Am Anfang bleibt der Ton gleich: Wer Rhythmus lernt, soll nicht auch noch Tonhöhen deuten. */
export function harmonyFor(place: {
  index: number;
  steadyPitch?: boolean;
}): (typeof HARMONY)[number] {
  return harmonyAt(place.steadyPitch ? 0 : place.index);
}

/** B-Dur aufwärts: Fanfare und richtige Antworten klingen in der Tonart des Spiels. */
export const JINGLE_NOTES = [233.08, 293.66, 349.23, 466.16, 587.33] as const;

export type HeldTone = { stop: () => void };

/** Was Spiel und Kalibrierung vom Ton brauchen; im Test ein Fake. */
export interface AudioPort {
  now(): number;
  latencySec(): number;
  /** Eingabezeit (`performance.now()`-Basis) in Audiozeit umrechnen. */
  wallToAudio(wallMs: number): number;
  syncClock(): void;
  scheduleClick(at: number, accent: boolean, volume?: number): void;
  scheduleNote(
    at: number,
    durationSec: number,
    hz: number,
    volume?: number,
  ): void;
  scheduleBass(at: number, durationSec: number, hz: number): void;
  startHeld(hz: number): HeldTone;
  playShort(hz: number): void;
  cancelScheduled(): void;
}

type Scheduled = { source: AudioScheduledSourceNode; gain: GainNode };

function noiseClick(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] =
      Math.exp((-i / ctx.sampleRate) * 35) * (Math.random() * 2 - 1) * 0.35;
  }
  return buffer;
}

export class RhythmAudio implements AudioPort {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private click: AudioBuffer | null = null;
  private scheduled = new Set<Scheduled>();
  private clockOffset: number | null = null;

  /** Muss aus einer Nutzerhandlung heraus laufen, sonst bleibt der Kontext stumm. */
  async ensure(): Promise<void> {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio API nicht verfügbar");
    if (!this.ctx) {
      this.ctx = new Ctor({ latencyHint: "interactive" });
      this.click = noiseClick(this.ctx);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const limiter = this.ctx.createDynamicsCompressor();
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.clockOffset = null;
    this.syncClock();
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  latencySec(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const output =
      typeof ctx.outputLatency === "number" ? ctx.outputLatency : 0;
    const base = typeof ctx.baseLatency === "number" ? ctx.baseLatency : 0;
    return output + base;
  }

  /** `currentTime` springt in Audio-Blöcken; geglättet ergibt das eine ruhige Uhr. */
  syncClock(): void {
    if (!this.ctx) return;
    const sample = this.ctx.currentTime - performance.now() / 1000;
    this.clockOffset =
      this.clockOffset === null
        ? sample
        : this.clockOffset + (sample - this.clockOffset) * 0.05;
  }

  wallToAudio(wallMs: number): number {
    return wallMs / 1000 + (this.clockOffset ?? 0);
  }

  private track(entry: Scheduled): void {
    this.scheduled.add(entry);
    entry.source.addEventListener("ended", () => this.scheduled.delete(entry));
  }

  scheduleClick(at: number, accent: boolean, volume?: number): void {
    const { ctx, master, click } = this;
    if (!ctx || !master || !click) return;
    const gain = ctx.createGain();
    gain.gain.value = volume ?? (accent ? 0.6 : 0.36);
    const source = ctx.createBufferSource();
    source.buffer = click;
    source.connect(gain);
    gain.connect(master);
    source.start(Math.max(at, ctx.currentTime));
    this.track({ source, gain });
  }

  /** Zwei verstimmte Sägezähne hinter einem sich öffnenden Filter: klingt nach Blech. */
  private brass(at: number, hz: number, peak: number) {
    const { ctx, master } = this;
    if (!ctx || !master) return null;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(hz * 1.5, at);
    filter.frequency.linearRampToValueAtTime(hz * 5, at + 0.045);
    filter.frequency.linearRampToValueAtTime(hz * 3.4, at + 0.16);
    filter.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.012);
    const oscillators = [-5, 5].map((detune) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = hz;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      return osc;
    });
    return { ctx, gain, oscillators };
  }

  scheduleNote(
    at: number,
    durationSec: number,
    hz: number,
    volume = 0.17,
  ): void {
    const startAt = Math.max(at, this.now());
    const voice = this.brass(startAt, hz, volume);
    if (!voice) return;
    // Etwas vor Notenende absetzen, sonst verschmelzen gleiche Töne hintereinander.
    const soundingSec = Math.max(0.05, durationSec * 0.9);
    const end = startAt + soundingSec;
    voice.gain.gain.setValueAtTime(
      volume,
      Math.max(startAt + 0.012, end - 0.03),
    );
    voice.gain.gain.linearRampToValueAtTime(0, end);
    for (const osc of voice.oscillators) {
      osc.stop(end + 0.01);
      this.track({ source: osc, gain: voice.gain });
    }
  }

  scheduleBass(at: number, durationSec: number, hz: number): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    const startAt = Math.max(at, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hz;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.13, startAt + 0.03);
    gain.gain.linearRampToValueAtTime(0, startAt + durationSec);
    osc.connect(gain);
    gain.connect(master);
    osc.start(startAt);
    osc.stop(startAt + durationSec + 0.02);
    this.track({ source: osc, gain });
  }

  startHeld(hz: number): HeldTone {
    const voice = this.brass(this.now(), hz, 0.2);
    if (!voice) return { stop: () => undefined };
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = voice.ctx.currentTime;
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
        voice.gain.gain.linearRampToValueAtTime(0, t + 0.03);
        for (const osc of voice.oscillators) osc.stop(t + 0.04);
      },
    };
  }

  playShort(hz: number): void {
    this.scheduleNote(this.now(), 0.14, hz, 0.2);
  }

  /** Kleine Melodie als Belohnung, z. B. je Stern ein Ton höher. */
  jingle(frequencies: readonly number[], stepSec = 0.13, delaySec = 0): void {
    const start = this.now() + delaySec;
    frequencies.forEach((hz, i) => {
      this.scheduleNote(start + i * stepSec, stepSec * 1.4, hz, 0.2);
    });
  }

  cancelScheduled(): void {
    for (const { source, gain } of this.scheduled) {
      try {
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch {
        /* Schon gestoppt. */
      }
    }
    this.scheduled.clear();
  }

  close(): void {
    this.cancelScheduled();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.click = null;
  }
}
