export interface BeatAnalysis {
  bpm: number | null;
  beatTimes: number[];
  duration: number;
}

export async function analyzeAudioBeats(source: ArrayBuffer): Promise<BeatAnalysis> {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not supported in this browser");

  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(source.slice(0));
    const channelCount = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const frameSize = 1024;
    const hopSize = 512;
    const mono = new Float32Array(buffer.length);

    for (let channel = 0; channel < channelCount; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) mono[i] += samples[i] / channelCount;
    }

    const energy: number[] = [];
    for (let start = 0; start + frameSize < mono.length; start += hopSize) {
      let sum = 0;
      for (let i = 0; i < frameSize; i++) {
        const value = mono[start + i];
        sum += value * value;
      }
      energy.push(Math.sqrt(sum / frameSize));
    }

    const novelty = energy.map((value, index) => Math.max(0, value - (energy[index - 1] ?? value)));
    const sorted = [...novelty].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const upper = sorted[Math.floor(sorted.length * 0.85)] ?? 0;
    const threshold = Math.max(median * 1.8, upper * 0.72, 0.008);
    const minGapFrames = Math.max(1, Math.floor((0.22 * sampleRate) / hopSize));
    const peaks: number[] = [];

    for (let i = 1; i < novelty.length - 1; i++) {
      if (novelty[i] < threshold || novelty[i] < novelty[i - 1] || novelty[i] <= novelty[i + 1]) continue;
      if (!peaks.length || i - peaks[peaks.length - 1] >= minGapFrames) peaks.push(i);
      else if (novelty[i] > novelty[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i;
    }

    const beatTimes = peaks.map((frame) => Number(((frame * hopSize) / sampleRate).toFixed(3)));
    const intervals: number[] = [];
    for (let i = 1; i < beatTimes.length; i++) {
      const interval = beatTimes[i] - beatTimes[i - 1];
      if (interval >= 0.28 && interval <= 1.2) intervals.push(interval);
    }
    intervals.sort((a, b) => a - b);
    const middle = intervals.length ? intervals[Math.floor(intervals.length / 2)] : 0;
    let bpm = middle ? Math.round(60 / middle) : null;
    if (bpm && bpm < 70) bpm *= 2;
    if (bpm && bpm > 180) bpm = Math.round(bpm / 2);
    if (bpm && (bpm < 60 || bpm > 200)) bpm = null;

    return { bpm, beatTimes, duration: Number(buffer.duration.toFixed(2)) };
  } finally {
    await context.close();
  }
}
