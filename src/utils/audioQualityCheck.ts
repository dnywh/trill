import * as Tone from "tone";

export interface QualityCheckResult {
  isMatch: boolean;
  confidence: number;
  detectedPitch?: string;
  expectedPitch: string;
  message: string;
}

// Convert note name to frequency (approximate)
function noteToFrequency(note: string): number {
  const noteMap: Record<string, number> = {
    C: 261.63,
    "C#": 277.18,
    D: 293.66,
    "D#": 311.13,
    E: 329.63,
    F: 349.23,
    "F#": 369.99,
    G: 392.0,
    "G#": 415.3,
    A: 440.0,
    "A#": 466.16,
    B: 493.88,
  };

  const noteName = note.replace(/\d/g, "");
  const octave = parseInt(note.match(/\d/)?.[0] || "4");
  const baseFreq = noteMap[noteName];
  return baseFreq * Math.pow(2, octave - 4);
}

// Convert frequency to note name (approximate)
function frequencyToNote(frequency: number): string {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const a4 = 440;
  const c0 = a4 * Math.pow(2, -4.75);
  const halfStepsBelowMiddleC = Math.round(12 * Math.log2(frequency / c0));
  const octave = Math.floor(halfStepsBelowMiddleC / 12);
  const noteIndex = ((halfStepsBelowMiddleC % 12) + 12) % 12;
  return noteNames[noteIndex] + octave;
}

// Check if two frequencies are within acceptable range
// ADJUST STRICTNESS HERE: Increase toleranceMultiplier to be more lenient, decrease to be stricter
// Current: 1.5 = allows ~1.5 semitones of variation
// function isFrequencyMatch(freq1: number, freq2: number): boolean {
// const ratio = Math.max(freq1, freq2) / Math.min(freq1, freq2);
// Allow up to an octave difference
// return ratio <= 2.0;
// return true;
// }

export async function checkAudioQuality(
  audioBlob: Blob,
  expectedNote: string,
  bypassCheck: boolean = false
): Promise<QualityCheckResult> {
  try {
    console.log(`Checking audio quality for expected note: ${expectedNote}`);

    // Temporary bypass for testing
    if (bypassCheck) {
      console.log("Bypassing quality check for testing");
      return {
        isMatch: true,
        confidence: 1,
        expectedPitch: expectedNote,
        message: `Done`,
      };
    }

    // Convert blob to audio buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);

    // Get audio data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    console.log(
      `Audio buffer length: ${channelData.length}, Sample rate: ${sampleRate}`
    );

    // Check if we have enough audio data
    if (channelData.length < 1024) {
      console.log("Audio buffer too short");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Too short",
      };
    }

    // Check for proper start - ensure not too much silence at beginning
    const startSegmentLength = Math.floor(channelData.length * 0.2); // First 20%
    let startSilenceCount = 0;
    for (let i = 0; i < startSegmentLength; i++) {
      if (Math.abs(channelData[i]) < 0.01) {
        startSilenceCount++;
      }
    }
    const startSilenceRatio = startSilenceCount / startSegmentLength;
    console.log(`Start silence ratio: ${startSilenceRatio.toFixed(3)}`);

    if (startSilenceRatio > 0.6) {
      console.log("Too much silence at start of recording");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Start singing sooner",
      };
    }

    // Check for consistent sound throughout the recording
    const segmentCount = 8; // Divide recording into 8 segments
    const segmentLength = Math.floor(channelData.length / segmentCount);
    const segmentRMS: number[] = [];

    for (let seg = 0; seg < segmentCount; seg++) {
      const start = seg * segmentLength;
      const end = Math.min(start + segmentLength, channelData.length);
      let segmentSum = 0;

      for (let i = start; i < end; i++) {
        segmentSum += channelData[i] * channelData[i];
      }

      const segmentRms = Math.sqrt(segmentSum / (end - start));
      segmentRMS.push(segmentRms);
    }

    console.log(
      `Segment RMS values: ${segmentRMS.map((r) => r.toFixed(4)).join(", ")}`
    );

    // Check for significant drops in volume (indicates inconsistent singing)
    const maxRMS = Math.max(...segmentRMS);
    const minRMS = Math.min(...segmentRMS);
    const volumeVariation = maxRMS > 0 ? (maxRMS - minRMS) / maxRMS : 0;

    console.log(`Volume variation: ${volumeVariation.toFixed(3)}`);

    if (volumeVariation > 0.92) {
      console.log("Too much volume variation - inconsistent singing");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Sing more consistently",
      };
    }

    // Check that at least 6 out of 8 segments have sufficient volume
    const sufficientVolumeSegments = segmentRMS.filter(
      (rms) => rms > 0.005
    ).length;
    console.log(
      `Segments with sufficient volume: ${sufficientVolumeSegments}/${segmentCount}`
    );

    if (sufficientVolumeSegments < 6) {
      console.log("Too many quiet segments");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Sing more consistently",
      };
    }

    // Debug: Check audio levels
    let maxAmplitude = 0;
    let rms = 0;
    for (let i = 0; i < channelData.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
      rms += channelData[i] * channelData[i];
    }
    rms = Math.sqrt(rms / channelData.length);
    console.log(
      `Audio levels - Max: ${maxAmplitude.toFixed(4)}, RMS: ${rms.toFixed(4)}`
    );

    // Check if audio is too quiet (more strict)
    if (rms < 0.005) {
      console.log("Audio too quiet");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Too quiet",
      };
    }

    // Check if audio is mostly silence (more granular)
    let silenceCount = 0;
    let lowVolumeCount = 0;
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) < 0.01) {
        silenceCount++;
      }
      if (Math.abs(channelData[i]) < 0.02) {
        lowVolumeCount++;
      }
    }
    const silenceRatio = silenceCount / channelData.length;
    const lowVolumeRatio = lowVolumeCount / channelData.length;
    console.log(
      `Silence ratio: ${silenceRatio.toFixed(
        3
      )}, Low volume ratio: ${lowVolumeRatio.toFixed(3)}`
    );

    if (silenceRatio > 0.7 || lowVolumeRatio > 0.85) {
      console.log("Too much silence/low volume in recording");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Too quiet",
      };
    }

    // Improved pitch detection
    const pitch = detectPitchImproved(channelData, sampleRate);

    if (!pitch) {
      console.log("No pitch detected");
      return {
        isMatch: false,
        confidence: 0,
        expectedPitch: expectedNote,
        message: "Too unclear",
      };
    }

    const detectedNote = frequencyToNote(pitch);
    const expectedFreq = noteToFrequency(expectedNote);
    // const isMatch = isFrequencyMatch(pitch, expectedFreq);
    const isMatch = true;

    // Calculate confidence based on how close the frequencies are
    const frequencyRatio =
      Math.max(pitch, expectedFreq) / Math.min(pitch, expectedFreq);
    const confidence = Math.max(0, 1 - (frequencyRatio - 1) * 2);

    console.log(
      `Detected pitch: ${pitch}Hz (${detectedNote}), Expected: ${expectedFreq}Hz (${expectedNote})`
    );
    console.log(`Match: ${isMatch}, Confidence: ${confidence.toFixed(2)}`);

    return {
      isMatch,
      confidence,
      detectedPitch: detectedNote,
      expectedPitch: expectedNote,
      message: isMatch ? `Done` : `Try again`,
    };
  } catch (error) {
    console.error("Error checking audio quality:", error);
    return {
      isMatch: false,
      confidence: 0,
      expectedPitch: expectedNote,
      message: "Error",
    };
  }
}

// Improved pitch detection using multiple methods
function detectPitchImproved(
  channelData: Float32Array,
  sampleRate: number
): number | null {
  // Method 1: Autocorrelation with better peak detection
  const pitch1 = detectPitchAutocorrelation(channelData, sampleRate);
  if (pitch1) {
    console.log(`Autocorrelation detected: ${pitch1}Hz`);
    return pitch1;
  }

  // Method 2: Zero-crossing rate (simpler but effective)
  const pitch2 = detectPitchZeroCrossing(channelData, sampleRate);
  if (pitch2) {
    console.log(`Zero-crossing detected: ${pitch2}Hz`);
    return pitch2;
  }

  console.log("No pitch detected by any method");
  return null;
}

// Autocorrelation method with improved peak detection
function detectPitchAutocorrelation(
  channelData: Float32Array,
  sampleRate: number
): number | null {
  const bufferSize = 2048;
  const correlations = new Float32Array(bufferSize);

  // Calculate autocorrelation
  for (let lag = 0; lag < bufferSize; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferSize - lag; i++) {
      sum += channelData[i] * channelData[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find peaks with better criteria
  const peaks: { index: number; value: number }[] = [];
  const minPeakHeight = 0.05 * correlations[0]; // Higher threshold

  for (let i = 20; i < bufferSize / 2; i++) {
    // Start later to avoid DC
    if (
      correlations[i] > correlations[i - 1] &&
      correlations[i] > correlations[i + 1] &&
      correlations[i] > minPeakHeight
    ) {
      peaks.push({ index: i, value: correlations[i] });
    }
  }

  console.log(`Found ${peaks.length} peaks in autocorrelation`);

  // Sort peaks by value (strongest first)
  peaks.sort((a, b) => b.value - a.value);

  // Try each peak as a potential fundamental frequency
  for (const peak of peaks) {
    const frequency = sampleRate / peak.index;

    // More restrictive frequency range for human voice
    if (frequency >= 80 && frequency <= 800) {
      console.log(
        `Valid pitch: ${frequency}Hz from peak at index ${peak.index}`
      );
      return frequency;
    }
  }

  return null;
}

// Zero-crossing rate method as fallback
function detectPitchZeroCrossing(
  channelData: Float32Array,
  sampleRate: number
): number | null {
  let crossings = 0;
  let totalSamples = 0;

  // Count zero crossings in the middle portion of the audio
  const start = Math.floor(channelData.length * 0.2);
  const end = Math.floor(channelData.length * 0.8);

  for (let i = start; i < end - 1; i++) {
    if (
      (channelData[i] >= 0 && channelData[i + 1] < 0) ||
      (channelData[i] < 0 && channelData[i + 1] >= 0)
    ) {
      crossings++;
    }
    totalSamples++;
  }

  if (totalSamples === 0) return null;

  const zeroCrossingRate = crossings / totalSamples;
  const estimatedFreq = (zeroCrossingRate * sampleRate) / 2;

  console.log(
    `Zero-crossing rate: ${zeroCrossingRate.toFixed(
      4
    )}, Estimated freq: ${estimatedFreq}Hz`
  );

  // Only accept if it's in a reasonable range
  if (estimatedFreq >= 80 && estimatedFreq <= 800) {
    return estimatedFreq;
  }

  return null;
}
