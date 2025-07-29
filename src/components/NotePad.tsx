import NoteButton from "./NoteButton";
import { getOrCreateContributorId } from "../utils/getOrCreateContributorId";
import { styled } from "@pigment-css/react";

interface NotePadProps {
  notes: string[];
}

export default function NotePad({ notes }: NotePadProps) {
  const contributorId = getOrCreateContributorId();
  return (
    <Section>
      {notes.map((note, index) => (
        <NoteButton key={index} note={note} contributorId={contributorId} />
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
