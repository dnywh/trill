import { useState, useEffect } from "react";
import * as Tone from "tone";
import { styled } from "@pigment-css/react";
// import TestComponent from "./components/TestComponent";
import NotePad from "./components/NotePad";
import NoteButton from "./components/NoteButton";
import MusicPlayer from "./components/MusicPlayer";
import { extractUniqueNotes, getNoteStats } from "./utils/noteExtractor";

function App() {
  const [notes, setNotes] = useState([]);
  const [melody, setMelody] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load song data and extract notes from track 0
  useEffect(() => {
    const loadSongData = async () => {
      try {
        const response = await fetch("/when-the-saints.json");
        const data = await response.json();

        // Extract unique notes from track 0 only
        const track0Notes = data.tracks[0].notes.map((n) => ({
          note: n.name,
          duration: n.duration, // in seconds
        }));

        // Get unique notes from track 0 for the NotePad
        const uniqueNotes = [...new Set(track0Notes.map((n) => n.note))].sort();

        setMelody(track0Notes);
        setNotes(uniqueNotes);
        setIsLoading(false);

        console.log("Loaded melody:", track0Notes);
        console.log("Unique notes:", uniqueNotes);
      } catch (error) {
        console.error("Error loading song data:", error);
        setIsLoading(false);
      }
    };

    loadSongData();
  }, []);

  if (isLoading) {
    return (
      <AppContainer>
        <div>Loading song data...</div>
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <MusicPlayer melody={melody} />
      <NotePad notes={notes} />
    </AppContainer>
  );
}

export default App;

const AppContainer = styled("div")({
  fontFamily: "sans-serif",
  padding: "2rem",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "2rem",
  "@media (min-width: 768px)": {
    flexDirection: "row",
  },
});
