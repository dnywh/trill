import { useState, useEffect } from "react";
import { styled } from "@pigment-css/react";
import NotePad from "./components/NotePad";
import MusicPlayer from "./components/MusicPlayer";
import { sortNotesMusically } from "./utils/noteExtractor";

function App() {
  const [notes, setNotes] = useState<string[]>([]);
  const [melody, setMelody] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [userRecordedNotes, setUserRecordedNotes] = useState<string[]>([]);

  // Load song data and extract notes from track 0
  useEffect(() => {
    const loadSongData = async () => {
      try {
        const response = await fetch("/when-the-saints.json");
        const data = await response.json();

        // Extract unique notes from track 0 only
        const track0Notes = data.tracks[0].notes.map(
          (n: { name: string; duration: number }) => ({
            note: n.name,
            duration: n.duration, // in seconds
          })
        );

        // Get unique notes from track 0 for the NotePad
        const uniqueNotes = sortNotesMusically(
          Array.from(new Set(track0Notes.map((n: { note: string }) => n.note)))
        );

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

  const handleRecordingStart = () => {
    console.log("Recording started");
    setIsRecording(true);
  };

  const handleRecordingEnd = () => {
    console.log("Recording ended");
    setIsRecording(false);
  };

  const handlePlaybackStateChange = (isPlaying: boolean) => {
    console.log("Playback state changed:", isPlaying);
  };

  const handleUserRecordedNotesChange = (recordedNotes: string[]) => {
    console.log("User recorded notes updated:", recordedNotes);
    setUserRecordedNotes(recordedNotes);
  };

  if (isLoading) {
    return (
      <AppContainer>
        <div>Loading...</div>
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <MusicPlayer
        melody={melody}
        isRecording={isRecording}
        onPlaybackStateChange={handlePlaybackStateChange}
        onUserRecordedNotesChange={handleUserRecordedNotesChange}
      />
      <NotePad
        notes={notes}
        onRecordingStart={handleRecordingStart}
        onRecordingEnd={handleRecordingEnd}
        isRecording={isRecording}
        userRecordedNotes={userRecordedNotes}
      />
    </AppContainer>
  );
}

export default App;

const AppContainer = styled("main")({
  padding: "var(--padding-page)",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  gap: "var(--padding-page)",
  "@media (min-width: 768px)": {
    flexDirection: "row",
  },
});
