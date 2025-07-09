import { styled } from "@pigment-css/react";

const StyledTest = styled("div")({
  margin: "0.4rem",
  padding: "0.8rem 1.2rem",
  fontSize: "1rem",
  fontWeight: 500,
  borderRadius: 8,
  border: "2px solid #4a90e2",
  background: "white",
  color: "#4a90e2",
  cursor: "pointer",
  transition: "all 0.2s ease",
  minWidth: 60,
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    background: "#e3f2fd",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 8px rgba(74, 144, 226, 0.2)",
  },
  "&.pressed": {
    background: "#4a90e2",
    color: "white",
    transform: "translateY(1px)",
    boxShadow: "0 2px 4px rgba(74, 144, 226, 0.3)",
  },
  "&.playing": {
    background: "#4caf50",
    borderColor: "#4caf50",
    color: "white",
    animation: "pulse 0.6s ease-in-out",
  },
  "&:active": {
    transform: "translateY(1px)",
  },
  "@keyframes pulse": {
    "0%": { transform: "scale(1)" },
    "50%": { transform: "scale(1.05)" },
    "100%": { transform: "scale(1)" },
  },
});

export default function TestComponent() {
  return <StyledTest>Foo bar</StyledTest>;
}
