declare module "./NoteButton" {
  interface NoteButtonProps {
    note: string;
    onPlay: (note: string) => void;
    isPlaying?: boolean;
  }

  const NoteButton: React.FC<NoteButtonProps>;
  export default NoteButton;
}
