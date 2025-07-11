import NoteButton from "./NoteButton";
import { styled } from "@pigment-css/react";

export default function NotePad({ notes }) {
  return (
    <Section>
      <NoteButtons>
        {notes.map((note, index) => (
          <NoteButton key={index} note={note} />
        ))}
      </NoteButtons>
    </Section>
  );
}

const Section = styled("div")({
  marginBottom: "3rem",
  padding: "2rem",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
});

const NoteButtons = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0.4rem",
  maxWidth: "800px",
  margin: "0 auto",
});
