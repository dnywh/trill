import NoteButton from "./NoteButton";
import { getOrCreateContributorId } from "../utils/getOrCreateContributorId";
import { styled } from "@pigment-css/react";

interface NotePadProps {
  notes: string[];
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}

export default function NotePad({
  notes,
  onRecordingStart,
  onRecordingEnd,
}: NotePadProps) {
  const contributorId = getOrCreateContributorId();
  return (
    <Section>
      {notes.map((note, index) => (
        <NoteButton
          key={index}
          note={note}
          contributorId={contributorId}
          onRecordingStart={onRecordingStart}
          onRecordingEnd={onRecordingEnd}
        />
      ))}
    </Section>
  );
}

const Section = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gridAutoRows: "120px",
  gap: "1rem",
  width: "100%",
  justifyItems: "start",
});
