// Extract all unique notes from the MIDI data
export function extractUniqueNotes(songData) {
  if (!songData || !songData.tracks) return [];

  const allNotes = new Set();

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
    const aOctave = parseInt(a.match(/\d/)[0]);
    const bOctave = parseInt(b.match(/\d/)[0]);

    if (aOctave !== bOctave) {
      return aOctave - bOctave;
    }

    return noteOrder.indexOf(aNote) - noteOrder.indexOf(bNote);
  });

  return sortedNotes;
}

// Get note statistics
export function getNoteStats(songData) {
  if (!songData || !songData.tracks) return {};

  const noteCounts = {};

  songData.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      noteCounts[note.name] = (noteCounts[note.name] || 0) + 1;
    });
  });

  return noteCounts;
}

// Transform note names from MIDI format to database format
// Examples: "C4" -> "c4", "F#2" -> "fsharp2", "C#3" -> "csharp3"
export function transformNoteForDatabase(noteName) {
  if (!noteName) return noteName;

  console.log(`Transforming note: ${noteName}`);

  // Handle sharp notes (#)
  let transformed = noteName.replace(/#/g, "sharp");

  // Convert to lowercase
  transformed = transformed.toLowerCase();

  console.log(`Transformed to: ${transformed}`);

  return transformed;
}
