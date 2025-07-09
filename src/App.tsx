import { useState, useEffect } from "react";
import * as Tone from "tone";
import { styled } from "@pigment-css/react";
import TestComponent from "./components/TestComponent";
import StyledMusicButton from "./components/StyledMusicButton";

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

function App() {
  const [synth, setSynth] = useState<Tone.Synth | null>(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);

  // Define a list of notes with Tone.js notation
  const notes = [
    "C4",
    "E4",
    "F4",
    "G4",
    "C5",
    "E4",
    "F4",
    "G4",
    "G4",
    "A4",
    "G4",
    "F4",
    "E4",
    "C4",
    "E4",
    "D4",
    "C4",
  ];

  useEffect(() => {
    // Create a synth using Tone.js
    const newSynth = new Tone.Synth().toDestination();
    setSynth(newSynth);

    console.log("Synth initialized");
  }, []);

  const playNote = async (note: string) => {
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

  return (
    <AppContainer>
      <Title>When the Saints Go Marching In</Title>
      <Description>
        Click the buttons to play each note of the melody
      </Description>
      <TestComponent />

      <NoteButtons>
        {notes.map((note, index) => (
          <StyledMusicButton key={index} note={note} onPlay={playNote} />
        ))}
      </NoteButtons>
    </AppContainer>
  );
}

export default App;
