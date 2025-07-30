// Extract all unique notes from the MIDI data
export function extractUniqueNotes(songData: {
  tracks: { notes: { name: string }[] }[];
}): string[] {
  if (!songData || !songData.tracks) return [];

  const allNotes = new Set<string>();

  songData.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      allNotes.add(note.name);
    });
  });

  // Convert to array and sort by pitch
  const sortedNotes = Array.from(allNotes).sort((a, b) => {
    // Simple sorting - you might want to implement proper musical note sorting
    const noteOrder = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const aNote = a.replace(/\d/g, "");
    const bNote = b.replace(/\d/g, "");
    const aMatch = a.match(/\d/);
    const bMatch = b.match(/\d/);
    const aOctave = aMatch ? parseInt(aMatch[0]) : 0;
    const bOctave = bMatch ? parseInt(bMatch[0]) : 0;

    if (aOctave !== bOctave) {
      return aOctave - bOctave;
    }

    return noteOrder.indexOf(aNote) - noteOrder.indexOf(bNote);
  });

  return sortedNotes;
}

// Get note statistics
export function getNoteStats(songData: {
  tracks: { notes: { name: string }[] }[];
}): Record<string, number> {
  if (!songData || !songData.tracks) return {};

  const noteCounts: Record<string, number> = {};

  songData.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      noteCounts[note.name] = (noteCounts[note.name] || 0) + 1;
    });
  });

  return noteCounts;
}

// Transform note names from MIDI format to database format
// Examples: "C4" -> "c4", "F#2" -> "fsharp2", "C#3" -> "csharp3"
export function transformNoteForDatabase(noteName: string): string {
  if (!noteName) return noteName;

  console.log(`Transforming note: ${noteName}`);

  // Handle sharp notes (#)
  let transformed = noteName.replace(/#/g, "sharp");

  // Convert to lowercase
  transformed = transformed.toLowerCase();

  console.log(`Transformed to: ${transformed}`);

  return transformed;
}

// Sort notes musically by pitch (lowest to highest)
export function sortNotesMusically(notes: string[]): string[] {
  const noteOrder = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  return notes.sort((a, b) => {
    // Extract note name and octave
    const aMatch = a.match(/^([A-G]#?)(\d+)$/);
    const bMatch = b.match(/^([A-G]#?)(\d+)$/);

    if (!aMatch || !bMatch) {
      // Fallback to alphabetical sort if parsing fails
      return a.localeCompare(b);
    }

    const [, aNote, aOctaveStr] = aMatch;
    const [, bNote, bOctaveStr] = bMatch;
    const aOctave = parseInt(aOctaveStr);
    const bOctave = parseInt(bOctaveStr);

    // First compare by octave
    if (aOctave !== bOctave) {
      return aOctave - bOctave;
    }

    // Then compare by note within the same octave
    const aNoteIndex = noteOrder.indexOf(aNote);
    const bNoteIndex = noteOrder.indexOf(bNote);

    return aNoteIndex - bNoteIndex;
  });
}
