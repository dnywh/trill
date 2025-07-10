import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Tone from "tone";
import { transformNoteForDatabase } from "../utils/noteExtractor";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Hardcoded sample URLs for three notes (replace with your actual URLs)
const sampleUrls = {
  D4: "https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/b3/xyz-456.wav",
  C4: "https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/c4/abc-123.wav",
  E4: "https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/c4/abc-123.wav",
};

const melody = ["B3", "C3", "C4"]; // Example melody

export default function SequentialPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);

  const playMelody = async () => {
    setIsPlaying(true);
    await Tone.start();
    console.log("Audio context started");

    const sampler = new Tone.Sampler({
      urls: sampleUrls,
      release: 1,
    }).toDestination();

    await Tone.loaded();
    console.log("Samples loaded");

    // Play each note in sequence, 1 beat each (500ms at 120bpm)
    for (let i = 0; i < melody.length; i++) {
      const note = melody[i];
      console.log(`Playing ${note}`);
      sampler.triggerAttackRelease(note, 0.5); // 0.5 seconds per note
      await new Promise((res) => setTimeout(res, 500));
    }

    setIsPlaying(false);
    console.log("Finished playback");
  };

  return (
    <div
      style={{
        padding: "2rem",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        margin: "2rem auto",
        maxWidth: 600,
      }}
    >
      <h2>Sequential User Note Playback (Sampler)</h2>
      <button
        onClick={playMelody}
        disabled={isPlaying}
        style={{ padding: "0.7rem 1.2rem", fontSize: "1rem" }}
      >
        {isPlaying ? "Playing..." : "Play Melody"}
      </button>
      <ul style={{ marginTop: 20, textAlign: "left" }}>
        {Object.entries(sampleUrls).map(([note, url]) => (
          <li key={note}>
            {note}:{" "}
            <a href={url} target="_blank" rel="noopener noreferrer">
              Audio
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
