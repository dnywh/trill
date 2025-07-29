import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Tone from "tone";
import { styled } from "@pigment-css/react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type MelodyNote = {
  note: string;
  duration: number;
};

type MusicPlayerProps = {
  melody?: MelodyNote[];
};

type SampleUrls = Record<string, string>;

function dbNoteToToneNote(dbNote: string): string {
  const match = dbNote.match(/^([a-g])sharp(\d)$/i);
  if (match) {
    return match[1].toUpperCase() + "#" + match[2];
  }
  return dbNote.charAt(0).toUpperCase() + dbNote.slice(1);
}

export default function MusicPlayer({ melody = [] }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sampleUrls, setSampleUrls] = useState<SampleUrls>({});
  const [isLoading, setIsLoading] = useState(false);
  const [contributorCount, setContributorCount] = useState<
    number | string | null
  >(null);

  useEffect(() => {
    async function fetchContributorCount() {
      const { data, error } = await supabase
        .rpc("get_unique_contributor_count")
        .single();

      if (error) {
        console.error("Error fetching count:", error);
      } else {
        const count = (data as { count: number } | null)?.count ?? 0;
        console.log("Number of unique contributors:", count);
        setContributorCount(count);
      }
    }
    fetchContributorCount();
  }, []);

  const fetchSampleUrls = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("recordings")
      .select("note, filename");
    if (error) {
      console.error("Supabase fetch error:", error);
      setIsLoading(false);
      return;
    }
    const urls: SampleUrls = {};
    (data as { note: string; filename: string }[]).forEach((rec) => {
      const note = dbNoteToToneNote(rec.note);
      urls[
        note
      ] = `https://tlyohnvvixywznonvgwj.supabase.co/storage/v1/object/public/recordings/${rec.note}/${rec.filename}.wav`;
    });
    setSampleUrls(urls);
    setIsLoading(false);
    console.log("Sample URLs:", urls);
  };

  const playMelody = async () => {
    setIsPlaying(true);
    await Tone.start();
    console.log("Audio context started");

    const sampler = new Tone.Sampler({
      urls: sampleUrls,
      release: 1,
    }).toDestination();

    await Tone.loaded();
    console.log("Samples loaded");

    for (let i = 0; i < melody.length; i++) {
      const { note, duration } = melody[i];
      if (!sampleUrls[note]) {
        console.warn(`No sample for ${note}, skipping`);
        continue;
      }
      console.log(`Playing ${note} for ${duration}s`);
      sampler.triggerAttackRelease(note, duration);
      await new Promise((res) => setTimeout(res, duration * 1000));
    }

    setIsPlaying(false);
    console.log("Finished playback");
  };

  return (
    <Container>
      <Title>Trill</Title>
      <h2>When the Saints Go Marching In</h2>
      <p>Sampled from {contributorCount} contributors around the world</p>
      <button
        onClick={fetchSampleUrls}
        disabled={isLoading || isPlaying}
        style={{ marginRight: 12, padding: "0.7rem 1.2rem", fontSize: "1rem" }}
      >
        {isLoading ? "Loading..." : "Fetch Recordings"}
      </button>
      <button
        onClick={playMelody}
        disabled={
          isPlaying ||
          Object.keys(sampleUrls).length === 0 ||
          melody.length === 0
        }
        style={{ padding: "0.7rem 1.2rem", fontSize: "1rem" }}
      >
        {isPlaying ? "Playing..." : "Play Song"}
      </button>
    </Container>
  );
}

const Container = styled("section")({
  aspectRatio: "1 / 1",
  padding: "2rem",
  background: "#FF781F",
  borderRadius: 12,
  width: "100%",
  height: "100%", // Add this to ensure height constraint
  "@media (min-width: 768px)": {
    minWidth: "440px",
    width: "50%",
    maxHeight: "50%", // Let aspect ratio control height in row layout
    flexShrink: 0,
  },
});

const Title = styled("h1")({
  color: "#333",
  marginBottom: "0.5rem",
});
