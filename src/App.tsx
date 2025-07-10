import { useState, useEffect } from "react";
import * as Tone from "tone";
import { styled } from "@pigment-css/react";
import TestComponent from "./components/TestComponent";
import PlayHumOnNote from "./components/PlayHumOnNote";
import StyledMusicButton from "./components/StyledMusicButton";
import PlaybackTest from "./components/PlaybackTest";
import SequentialPlayback from "./components/SequentialPlayback";
import { extractUniqueNotes, getNoteStats } from "./utils/noteExtractor";

function App() {
  const [synth, setSynth] = useState(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [songData, setSongData] = useState(null);
  const [uniqueNotes, setUniqueNotes] = useState([]);
  const [noteStats, setNoteStats] = useState({});
  const [currentlyRecording, setCurrentlyRecording] = useState(null);
  const [recordings, setRecordings] = useState({});
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // Load song data and extract notes
  useEffect(() => {
    const loadSongData = async () => {
      try {
        const response = await fetch("/when-the-saints.json");
        const data = await response.json();
        setSongData(data);

        const notes = extractUniqueNotes(data);
        const stats = getNoteStats(data);
        setUniqueNotes(notes);
        setNoteStats(stats);

        console.log("Extracted notes:", notes);
        console.log("Note statistics:", stats);
      } catch (error) {
        console.error("Error loading song data:", error);
      }
    };

    loadSongData();
  }, []);

  // Define a list of notes with Tone.js notation (keeping your original)
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
    <AppContainer>
      {/* <TestComponent /> */}
      <SequentialPlayback />
      <PlayHumOnNote />
      <Title>When the Saints Go Marching In</Title>
      <Description>
        Click the buttons to play each note of the melody
      </Description>

      <Section>
        <h2>Original Note Buttons</h2>
        <NoteButtons>
          {notes.map((note, index) => (
            <StyledMusicButton key={index} note={note} onPlay={playNote} />
          ))}
        </NoteButtons>
      </Section>

      {/* <Section>
        <h2>All Notes from the Song</h2>
        <p>
          These are all the unique notes found in "When the Saints Go Marching
          In":
        </p>
        <NoteGrid>
          {uniqueNotes.map((note, index) => (
            <div
              key={index}
              style={{
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{note}</div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>
                Used {noteStats[note] || 0} times
              </div>
              <div style={{ marginTop: "0.5rem" }}>
                <RecordingButton
                  onClick={() =>
                    currentlyRecording === note
                      ? stopRecording()
                      : startRecording(note)
                  }
                  className={currentlyRecording === note ? "recording" : ""}
                >
                  {currentlyRecording === note ? "Stop" : "Record"}
                </RecordingButton>
                {recordings[note] && (
                  <RecordingButton
                    onClick={() => playRecording(note)}
                    style={{
                      borderColor: "#27ae60",
                      color: "#27ae60",
                      marginLeft: "0.2rem",
                    }}
                  >
                    Play
                  </RecordingButton>
                )}
              </div>
            </div>
          ))}
        </NoteGrid>
      </Section> */}

      <Section>
        <h2>Full Song Playback</h2>
        <PlaybackTest />
      </Section>
    </AppContainer>
  );
}

export default App;

const AppContainer = styled("div")({
  fontFamily: "sans-serif",
  padding: "2rem",
  background: "#f7f7f7",
  minHeight: "100vh",
  textAlign: "center",
});

const Title = styled("h1")({
  color: "#333",
  marginBottom: "0.5rem",
});

const Description = styled("p")({
  color: "#666",
  marginBottom: "2rem",
});

const NoteButtons = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0.4rem",
  maxWidth: "800px",
  margin: "0 auto",
});

const Section = styled("div")({
  marginBottom: "3rem",
  padding: "2rem",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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
