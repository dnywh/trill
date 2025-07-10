import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Tone from "tone";
import { transformNoteForDatabase } from "../utils/noteExtractor";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const notes = [
  "B3",
  "C3",
  "D3",
  "E3",
  "F3",
  "G3",
  "A4",
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
];

export default function SequentialPlayback() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrls, setAudioUrls] = useState([]);
  const [error, setError] = useState(null);

  // Fetch a random recording for each note
  const fetchRecordings = async () => {
    setIsLoading(true);
    setError(null);
    const urls = [];
    for (const note of notes) {
      const dbNote = transformNoteForDatabase(note);
      try {
        const { data, error } = await supabase
          .from("recordings")
          .select("filename, note")
          .eq("note", dbNote)
          // .order("random()")
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error(`Supabase error for ${note}:`, error);
          urls.push(null);
          continue;
        }
        if (!data) {
          console.log(`No recording found for note: ${note}`);
          urls.push(null);
          continue;
        }
        const url = `https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/${data.note}/${data.filename}.wav`;
        console.log(`Fetched URL for ${note}:`, url);
        urls.push(url);
      } catch (err) {
        console.error(`Error fetching for ${note}:`, err);
        urls.push(null);
      }
    }
    setAudioUrls(urls);
    setIsLoading(false);
  };

  // Play the audio files sequentially
  const playSequentially = async () => {
    if (isPlaying || isLoading) return;
    setIsPlaying(true);
    await Tone.start();
    console.log("Audio context started");
    for (let i = 0; i < notes.length; i++) {
      const url = audioUrls[i];
      const note = notes[i];
      if (!url) {
        console.warn(`Skipping ${note} (no recording)`);
        continue;
      }
      try {
        console.log(`Playing note: ${note} from ${url}`);
        const audio = new window.Audio(url);
        audio.play();
        await new Promise((res) => (audio.onended = res));
      } catch (err) {
        console.error(`Error playing ${note}:`, err);
      }
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
      <h2>Sequential User Note Playback</h2>
      <button
        onClick={async () => {
          await fetchRecordings();
        }}
        disabled={isLoading || isPlaying}
        style={{ marginRight: 12, padding: "0.7rem 1.2rem", fontSize: "1rem" }}
      >
        {isLoading ? "Loading..." : "Fetch Recordings"}
      </button>
      <button
        onClick={playSequentially}
        disabled={isPlaying || isLoading || audioUrls.length === 0}
        style={{ padding: "0.7rem 1.2rem", fontSize: "1rem" }}
      >
        {isPlaying ? "Playing..." : "Play Song"}
      </button>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
      <ul style={{ marginTop: 20, textAlign: "left" }}>
        {notes.map((note, i) => (
          <li key={note}>
            {note}:{" "}
            {audioUrls[i] ? (
              <a href={audioUrls[i]} target="_blank" rel="noopener noreferrer">
                Audio
              </a>
            ) : (
              <span style={{ color: "#aaa" }}>No recording</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
