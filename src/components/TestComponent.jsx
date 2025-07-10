import { useState, useEffect, useRef } from "react";
import { styled } from "@pigment-css/react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function TestComponent() {
  const [recordings, setRecordings] = useState([]);
  useEffect(() => {
    getRecordings();
  }, []);

  async function getRecordings() {
    const { data } = await supabase.from("recordings").select();
    setRecordings(data);
    console.log({ data });
  }

  return (
    <StyledList>
      {recordings.map((rec) => (
        <li key={rec.id}>
          {rec.note}, {rec.filename}
        </li>
      ))}
    </StyledList>
  );
}

const StyledList = styled("ul")({
  color: "red",
  fontWeight: "bold",
});
