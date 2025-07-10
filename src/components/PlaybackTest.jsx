import { styled } from "@pigment-css/react";
import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import { createClient } from "@supabase/supabase-js";
import { transformNoteForDatabase } from "../utils/noteExtractor";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function PlaybackTest() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [songData, setSongData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const sequenceRef = useRef(null);
  const synthsRef = useRef({});
  const animationFrameRef = useRef(null);

  //   console.log(supabase);

  // Helper to fetch best hum for a note from Supabase
  const getHumForNote = async (noteName) => {
    const transformedNote = transformNoteForDatabase(noteName);
    console.log(`Fetching hum for note: ${noteName} -> ${transformedNote}`);

    try {
      const { data, error } = await supabase
        .from("recordings")
        .select("filename, note")
        .eq("note", transformedNote)
        .limit(1)
        .maybeSingle(); // Use maybeSingle to handle cases where no recording exists

      if (error) {
        console.error("Supabase error:", error);
        return null;
      }

      if (!data) {
        console.log(
          `No recording found for note: ${transformedNote} - this is expected for some notes`
        );
        return null;
      }

      console.log("Found recording data:", data);

      // Construct the URL using the correct field names
      const url = `https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/${data.note}/${data.filename}.mp3`;
      console.log("Constructed URL:", url);

      return url;
    } catch (error) {
      console.error("Error in getHumForNote:", error);
      return null;
    }
  };
  // Load the song data
  useEffect(() => {
    const loadSong = async () => {
      try {
        const response = await fetch("/when-the-saints.json");
        const data = await response.json();
        setSongData(data);
        setIsLoaded(true);
        console.log("Song loaded:", data);
      } catch (error) {
        console.error("Error loading song:", error);
      }
    };

    loadSong();
  }, []);

  // Initialize Tone.js synths for each track
  const initializeSynths = () => {
    if (!songData) return;

    songData.tracks.forEach((track, trackIndex) => {
      const instrumentName = track.instrument?.name || `track-${trackIndex}`;

      let synth;

      // Create different synths based on instrument family
      switch (track.instrument?.family) {
        case "piano":
          synth = new Tone.Sampler({
            urls: {
              C4: "C4.mp3",
              "D#4": "Ds4.mp3",
              "F#4": "Fs4.mp3",
            },
            baseUrl: "https://tonejs.github.io/audio/salamander/",
          }).toDestination();
          break;
        case "brass":
          synth = new Tone.Synth({
            oscillator: {
              type: "sawtooth",
            },
            envelope: {
              attack: 0.1,
              decay: 0.2,
              sustain: 0.3,
              release: 0.8,
            },
          }).toDestination();
          break;
        case "pipe":
          synth = new Tone.Synth({
            oscillator: {
              type: "sine",
            },
            envelope: {
              attack: 0.05,
              decay: 0.1,
              sustain: 0.3,
              release: 0.5,
            },
          }).toDestination();
          break;
        case "drums":
          // For drums, we'll use a simple synth but you could use Tone.Player for samples
          synth = new Tone.Synth({
            oscillator: {
              type: "square",
            },
            envelope: {
              attack: 0.01,
              decay: 0.1,
              sustain: 0,
              release: 0.1,
            },
          }).toDestination();
          break;
        default:
          synth = new Tone.Synth().toDestination();
      }

      synthsRef.current[trackIndex] = synth;
    });
  };

  // Start playback
  const startPlayback = async () => {
    if (!songData || isPlaying) return;

    try {
      // Start Tone.js audio context
      await Tone.start();
      console.log("Audio context started");

      // Initialize synths if not already done
      if (Object.keys(synthsRef.current).length === 0) {
        initializeSynths();
      }

      // Set tempo
      const tempo = songData.header.tempos[0]?.bpm || 120;
      Tone.Transport.bpm.value = tempo;
      console.log("Set tempo to:", tempo);

      // Calculate total duration
      const maxTicks = Math.max(
        ...songData.tracks.map((track) =>
          Math.max(
            ...track.notes.map((note) => note.ticks + note.durationTicks)
          )
        )
      );
      const ticksPerBeat = songData.header.ppq;
      const totalBeats = maxTicks / ticksPerBeat;
      const duration = totalBeats * (60 / tempo);
      setTotalDuration(duration);

      // Create sequence for each track
      const sequences = songData.tracks
        .map((track, trackIndex) => {
          const synth = synthsRef.current[trackIndex];
          if (!synth) return null;

          return track.notes.map((note) => {
            const timeInBeats = note.ticks / ticksPerBeat;
            const durationInBeats = note.durationTicks / ticksPerBeat;

            // Apply a minimum duration to make notes more musical
            const minDurationInBeats = 0.5; // Half a beat minimum
            const adjustedDuration = Math.max(
              durationInBeats,
              minDurationInBeats
            );

            return {
              time: timeInBeats,
              note: note.name,
              duration: adjustedDuration,
              velocity: note.velocity,
              synth: synth,
              originalDuration: durationInBeats,
            };
          });
        })
        .flat()
        .filter(Boolean);

      // Sort by time
      sequences.sort((a, b) => a.time - b.time);

      // Schedule all notes
      sequences.forEach(
        ({ time, note, duration, velocity, synth, originalDuration }) => {
          Tone.Transport.schedule(async (transportTime) => {
            try {
              const url = await getHumForNote(note);
              if (!url) {
                console.warn(`No hum found for ${note}, skipping...`);
                return;
              }

              const player = new Tone.Player({
                url,
                volume: -3,
                fadeOut: 0.2,
              }).toDestination();

              await player.load();
              player.start(transportTime, 0, duration);
              console.log(
                `Playing hum for ${note} at ${transportTime} for ${duration}`
              );
            } catch (error) {
              console.error(`Error playing hum for ${note}:`, error);
            }
          }, time);
        }
      );

      // Start transport
      Tone.Transport.start();
      setIsPlaying(true);
      console.log("Playback started");

      // Start progress tracking
      startProgressTracking();
    } catch (error) {
      console.error("Error starting playback:", error);
    }
  };

  // Stop playback
  const stopPlayback = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    console.log("Playback stopped");
  };

  // Track playback progress
  const startProgressTracking = () => {
    const updateProgress = () => {
      if (!isPlaying) return;

      const currentTimeSeconds = Tone.Transport.seconds;
      setCurrentTime(currentTimeSeconds);

      if (totalDuration > 0) {
        const progressPercent = (currentTimeSeconds / totalDuration) * 100;
        setProgress(Math.min(progressPercent, 100));
      }

      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    updateProgress();
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  return (
    <PlaybackContainer>
      <h2>MIDI Song Playback Test</h2>

      <StatusText>
        Status: {!isLoaded ? "Loading..." : isPlaying ? "Playing" : "Ready"}
        {isLoaded && (
          <div>
            <strong>Song:</strong> {songData?.header?.name || "Unknown"}
            <br />
            <strong>Tempo:</strong> {songData?.header?.tempos[0]?.bpm || 120}{" "}
            BPM
            <br />
            <strong>Tracks:</strong> {songData?.tracks?.length || 0}
          </div>
        )}
      </StatusText>

      <ControlsContainer>
        <Button
          onClick={startPlayback}
          disabled={!isLoaded || isPlaying}
          className={isPlaying ? "playing" : ""}
        >
          {isPlaying ? "Playing..." : "Play"}
        </Button>

        <Button onClick={stopPlayback} disabled={!isPlaying}>
          Stop
        </Button>
      </ControlsContainer>

      {isPlaying && (
        <div>
          <ProgressBar>
            <ProgressFill style={{ width: `${progress}%` }} />
          </ProgressBar>
          <div>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>
      )}

      {songData && (
        <TrackInfo>
          <h3>Track Information:</h3>
          {songData.tracks.map((track, index) => (
            <div key={index} style={{ marginBottom: "0.5rem" }}>
              <strong>Track {index + 1}:</strong>{" "}
              {track.name || `Track ${index + 1}`}
              <br />
              <small>
                Instrument: {track.instrument?.name || "Unknown"}(
                {track.instrument?.family || "Unknown"})
                <br />
                Notes: {track.notes?.length || 0}
              </small>
            </div>
          ))}
        </TrackInfo>
      )}
    </PlaybackContainer>
  );
}

const PlaybackContainer = styled("div")({
  padding: "2rem",
  maxWidth: "800px",
  margin: "0 auto",
  fontFamily: "Arial, sans-serif",
});

const ControlsContainer = styled("div")({
  display: "flex",
  gap: "1rem",
  marginBottom: "2rem",
  flexWrap: "wrap",
});

const Button = styled("button")({
  padding: "0.8rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 500,
  borderRadius: 8,
  border: "2px solid #4a90e2",
  background: "white",
  color: "#4a90e2",
  cursor: "pointer",
  transition: "all 0.2s ease",
  "&:hover": {
    background: "#e3f2fd",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 8px rgba(74, 144, 226, 0.2)",
  },
  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
    transform: "none",
  },
  "&.playing": {
    background: "#4caf50",
    borderColor: "#4caf50",
    color: "white",
  },
});

const StatusText = styled("div")({
  marginBottom: "1rem",
  padding: "1rem",
  borderRadius: 8,
  backgroundColor: "#f5f5f5",
  border: "1px solid #ddd",
});

const ProgressBar = styled("div")({
  width: "100%",
  height: "8px",
  backgroundColor: "#e0e0e0",
  borderRadius: 4,
  overflow: "hidden",
  marginBottom: "1rem",
});

const ProgressFill = styled("div")({
  height: "100%",
  backgroundColor: "#4caf50",
  transition: "width 0.1s ease",
});

const TrackInfo = styled("div")({
  marginTop: "1rem",
  padding: "1rem",
  backgroundColor: "#f9f9f9",
  borderRadius: 8,
  border: "1px solid #e0e0e0",
});
