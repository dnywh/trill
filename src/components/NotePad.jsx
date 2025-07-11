import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import NoteButton from "./NoteButton";
import { styled } from "@pigment-css/react";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// );

export default function NotePad({ notes }) {
  const [synth, setSynth] = useState(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  // const [songData, setSongData] = useState(null);
  // const [uniqueNotes, setUniqueNotes] = useState([]);
  // const [noteStats, setNoteStats] = useState({});
  const [currentlyRecording, setCurrentlyRecording] = useState(null);
  const [recordings, setRecordings] = useState({});
  const [mediaRecorder, setMediaRecorder] = useState(null);

  useEffect(() => {
    // Create a synth using Tone.js
    const newSynth = new Tone.Synth().toDestination();
    setSynth(newSynth);
    console.log("Synth initialized");
  }, []);

  const playNote = async (note) => {
    if (!synth) return;

    try {
      if (!isAudioStarted) {
        await Tone.start();
        setIsAudioStarted(true);
        console.log("Audio context started");
      }

      synth.triggerAttackRelease(note, "2n");
      console.log(`Playing note: ${note}`);
    } catch (error) {
      console.error("Error playing note:", error);
    }
  };

  // Recording functionality
  const startRecording = async (note) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => ({
          ...prev,
          [note]: url,
        }));
        console.log(`Recording saved for ${note}:`, url);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setCurrentlyRecording(note);
      console.log(`Started recording ${note}`);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && currentlyRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setMediaRecorder(null);
      setCurrentlyRecording(null);
      console.log(`Stopped recording ${currentlyRecording}`);
    }
  };

  const playRecording = (note) => {
    if (recordings[note]) {
      const audio = new Audio(recordings[note]);
      audio.play();
      console.log(`Playing recording for ${note}`);
    }
  };

  return (
    <Section>
      <NoteButtons>
        {notes.map((note, index) => (
          <NoteButton key={index} note={note} onPlay={playNote} />
        ))}
      </NoteButtons>
    </Section>
  );
}
const Section = styled("div")({
  marginBottom: "3rem",
  padding: "2rem",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
});

const NoteButtons = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0.4rem",
  maxWidth: "800px",
  margin: "0 auto",
});

const RecordingButton = styled("button")({
  padding: "0.8rem 1.5rem",
  fontSize: "1rem",
  fontWeight: "500",
  borderRadius: "8px",
  border: "2px solid #e74c3c",
  background: "white",
  color: "#e74c3c",
  cursor: "pointer",
  transition: "all 0.2s ease",
  margin: "0.2rem",
  "&:hover": {
    background: "#e74c3c",
    color: "white",
  },
  "&.recording": {
    background: "#e74c3c",
    color: "white",
    animation: "pulse 1s infinite",
  },
  "@keyframes pulse": {
    "0%": { transform: "scale(1)" },
    "50%": { transform: "scale(1.05)" },
    "100%": { transform: "scale(1)" },
  },
});

const NoteGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "0.5rem",
  maxWidth: "800px",
  margin: "0 auto",
});
