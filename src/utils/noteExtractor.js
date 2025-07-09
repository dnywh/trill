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
