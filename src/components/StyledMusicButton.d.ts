declare module "./StyledMusicButton" {
  interface StyledMusicButtonProps {
    note: string;
    onPlay: (note: string) => void;
    isPlaying?: boolean;
  }

  const StyledMusicButton: React.FC<StyledMusicButtonProps>;
  export default StyledMusicButton;
}
