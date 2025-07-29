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
  // padding: "2rem",
  // backgroundColor: "white",
  // borderRadius: "12px",
  // boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
  gridAutoRows: "80px",
  gap: "1rem",
  width: "100%",
  justifyItems: "start",
});
