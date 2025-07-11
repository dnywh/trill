import { styled } from "@pigment-css/react";
import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";
import { createClient } from "@supabase/supabase-js";
import { transformNoteForDatabase } from "../utils/noteExtractor";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function NoteButton({ note, onPlay, isPlaying = false }) {
  const [isPressed, setIsPressed] = useState(false);
  const [buttonState, setButtonState] = useState("idle"); // idle, listening, recording, done
  const [synth, setSynth] = useState(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  // Initialize synth on mount
  useEffect(() => {
    const newSynth = new Tone.Synth().toDestination();
    setSynth(newSynth);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = async () => {
        console.log("onstop callback triggered");
        const blob = new Blob(chunks, { type: "audio/wav" });
        await uploadRecording(blob);
        setButtonState("done");
        console.log(`Recording completed for ${note}`);
      };

      recorder.start();
      console.log(`Kicking off recording for ${note}`);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = chunks;
      setButtonState("recording");
      console.log(`Started recording ${note}`);

      // Stop recording after 3 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 3000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setButtonState("idle");
    }
  };

  const stopRecording = () => {
    console.log("stopRecording called");
    if (mediaRecorderRef.current) {
      console.log("Stopping recording...");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const uploadRecording = async (blob) => {
    try {
      console.log("Uploading recording...");
      const dbNote = transformNoteForDatabase(note);
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(`${dbNote}/${filename}.wav`, blob);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return;
      }

      // Insert record into database
      const { error: dbError } = await supabase.from("recordings").insert({
        note: dbNote,
        filename: filename,
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Database error:", dbError);
        return;
      }

      console.log(`Recording uploaded successfully for ${note}`);
    } catch (error) {
      console.error("Error uploading recording:", error);
    }
  };

  const handleClick = async () => {
    if (buttonState !== "idle") return; // Prevent multiple clicks during flow

    console.log(`NoteButton clicked: ${note}`);

    // Step 1: Play note and change text
    await playNote(note);
    setButtonState("listening");

    // Step 2: Start recording after 1.5 seconds
    timeoutRef.current = setTimeout(() => {
      startRecording();
    }, 1500);
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  const getButtonText = () => {
    switch (buttonState) {
      case "listening":
        return "Listen, then sing";
      case "recording":
        return "Keep singing...";
      case "done":
        return "Done";
      default:
        return note;
    }
  };

  const getButtonClassName = () => {
    const classes = [];
    if (isPressed) classes.push("pressed");
    if (isPlaying) classes.push("playing");
    if (buttonState === "listening") classes.push("listening");
    if (buttonState === "recording") classes.push("recording");
    if (buttonState === "done") classes.push("done");
    return classes.join(" ");
  };

  return (
    <StyledButton
      className={getButtonClassName()}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={buttonState !== "idle"}
    >
      {getButtonText()}
    </StyledButton>
  );
}

const StyledButton = styled("button")({
  margin: "0.4rem",
  padding: "0.8rem 1.2rem",
  fontSize: "1rem",
  fontWeight: 500,
  borderRadius: 8,
  border: "2px solid #4a90e2",
  background: "white",
  color: "#4a90e2",
  cursor: "pointer",
  transition: "all 0.2s ease",
  minWidth: 60,
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    background: "#e3f2fd",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 8px rgba(74, 144, 226, 0.2)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: 0.7,
  },
  "&.pressed": {
    background: "#4a90e2",
    color: "white",
    transform: "translateY(1px)",
    boxShadow: "0 2px 4px rgba(74, 144, 226, 0.3)",
  },
  "&.playing": {
    background: "#4caf50",
    borderColor: "#4caf50",
    color: "white",
    animation: "pulse 0.6s ease-in-out",
  },
  "&.listening": {
    background: "#ff9800",
    borderColor: "#ff9800",
    color: "white",
    animation: "pulse 1s infinite",
  },
  "&.recording": {
    background: "#e74c3c",
    borderColor: "#e74c3c",
    color: "white",
    animation: "pulse 0.5s infinite",
  },
  "&.done": {
    background: "#4caf50",
    borderColor: "#4caf50",
    color: "white",
  },
  "&:active": {
    transform: "translateY(1px)",
  },
  "@keyframes pulse": {
    "0%": { transform: "scale(1)" },
    "50%": { transform: "scale(1.05)" },
    "100%": { transform: "scale(1)" },
  },
});
