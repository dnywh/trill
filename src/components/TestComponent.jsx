import { styled } from "@pigment-css/react";

const StyledTest = styled("div")({
  color: "red",
  fontWeight: "bold",
});

export default function TestComponent() {
  return <StyledTest>Foo bar</StyledTest>;
}
