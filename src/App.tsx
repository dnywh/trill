import { useState, useEffect } from "react";
import * as Tone from "tone";
import { styled } from "@pigment-css/react";
// import TestComponent from "./components/TestComponent";
import NotePad from "./components/NotePad";
import NoteButton from "./components/NoteButton";
import MusicPlayer from "./components/MusicPlayer";
import { extractUniqueNotes, getNoteStats } from "./utils/noteExtractor";

function App() {
  // Define a list of notes with Tone.js notation (keeping your original)
  // TODO: should be imported from the song track 0 here
  // See MusicPlayer component. Lift out of there to here since we will be sharing this list of notes both with MusicPlayer
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

  return (
    <AppContainer>
      {/* <TestComponent /> */}
      <MusicPlayer />

      <NotePad notes={notes} />
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
