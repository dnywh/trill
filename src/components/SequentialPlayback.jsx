import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Tone from "tone";
import { transformNoteForDatabase } from "../utils/noteExtractor";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const melody = ["B3", "C3", "C4", "F#2", "C3"]; // Example melody, update as needed

function dbNoteToToneNote(dbNote) {
  const match = dbNote.match(/^([a-g])sharp(\d)$/i);
  if (match) {
    return match[1].toUpperCase() + "#" + match[2];
  }
  return dbNote.charAt(0).toUpperCase() + dbNote.slice(1);
}

export default function SequentialPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sampleUrls, setSampleUrls] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all available recordings and build the urls mapping
  const fetchSampleUrls = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("recordings")
      .select("note, filename");
    if (error) {
      console.error("Supabase fetch error:", error);
      setIsLoading(false);
      return;
    }
    // Build mapping: { C4: url, D4: url, ... }
    const urls = {};
    data.forEach((rec) => {
      const note = dbNoteToToneNote(rec.note);
      urls[
        note
      ] = `https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/${rec.note}/${rec.filename}.wav`;
    });
    setSampleUrls(urls);
    setIsLoading(false);
    console.log("Sample URLs:", urls);
  };

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

    for (let i = 0; i < melody.length; i++) {
      const note = melody[i];
      console.log(`Playing ${note}`);
      sampler.triggerAttackRelease(note, 0.5);
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
        onClick={fetchSampleUrls}
        disabled={isLoading || isPlaying}
        style={{ marginRight: 12, padding: "0.7rem 1.2rem", fontSize: "1rem" }}
      >
        {isLoading ? "Loading..." : "Fetch Recordings"}
      </button>
      <button
        onClick={playMelody}
        disabled={isPlaying || Object.keys(sampleUrls).length === 0}
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
