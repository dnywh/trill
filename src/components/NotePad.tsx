import NoteButton from "./NoteButton";
import { getOrCreateContributorId } from "../utils/getOrCreateContributorId";
import { styled } from "@pigment-css/react";

interface NotePadProps {
  notes: string[];
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  isRecording: boolean;
  userRecordedNotes?: string[];
}

export default function NotePad({
  notes,
  onRecordingStart,
  onRecordingEnd,
  isRecording,
  userRecordedNotes = [],
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
          isRecording={isRecording}
          isAlreadyRecorded={userRecordedNotes.includes(note)}
        />
      ))}
    </Section>
  );
}

const Section = styled("section")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gridAutoRows: "120px",
  gap: "var(--padding-page)",
  width: "100%",
  justifyItems: "start",
});
