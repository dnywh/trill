import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Tone from "tone";
import { styled, keyframes } from "@pigment-css/react";

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
  isRecording?: boolean;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
};

type SampleUrls = Record<string, string>;

function dbNoteToToneNote(dbNote: string): string {
  const match = dbNote.match(/^([a-g])sharp(\d)$/i);
  if (match) {
    return match[1].toUpperCase() + "#" + match[2];
  }
  return dbNote.charAt(0).toUpperCase() + dbNote.slice(1);
}

// SVG Icon Components
const PlayIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

function CircularText({
  text,
  radius = 80,
  startAngle = -90,
  endAngle = 90,
}: {
  text: string;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}) {
  const characters = text.split("");
  const angleStep = (endAngle - startAngle) / (characters.length - 1);

  return (
    <CircularTextContainer>
      {characters.map((char, index) => {
        const angle = startAngle + angleStep * index;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <CircularCharacter
            key={index}
            style={{
              transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
            }}
          >
            {char}
          </CircularCharacter>
        );
      })}
    </CircularTextContainer>
  );
}

export default function MusicPlayer({
  melody = [],
  isRecording = false,
  onPlaybackStateChange,
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sampleUrls, setSampleUrls] = useState<SampleUrls>({});
  const [isLoading, setIsLoading] = useState(false);
  const [contributorCount, setContributorCount] = useState<
    number | string | null
  >(null);
  const [isPaused, setIsPaused] = useState(false);
  const playbackRef = useRef<{
    sampler: Tone.Sampler | null;
    currentIndex: number;
    timeoutId: NodeJS.Timeout | null;
  }>({
    sampler: null,
    currentIndex: 0,
    timeoutId: null,
  });

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

  // Stop playback when recording starts
  useEffect(() => {
    if (isRecording && isPlaying) {
      stopPlayback();
    }
  }, [isRecording]);

  const stopPlayback = () => {
    if (playbackRef.current.timeoutId) {
      clearTimeout(playbackRef.current.timeoutId);
      playbackRef.current.timeoutId = null;
    }
    if (playbackRef.current.sampler) {
      playbackRef.current.sampler.dispose();
      playbackRef.current.sampler = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    playbackRef.current.currentIndex = 0;
    onPlaybackStateChange?.(false);
    console.log("Playback stopped");
  };

  const pausePlayback = () => {
    if (playbackRef.current.timeoutId) {
      clearTimeout(playbackRef.current.timeoutId);
      playbackRef.current.timeoutId = null;
    }
    setIsPaused(true);
    onPlaybackStateChange?.(false);
    console.log("Playback paused");
  };

  const resumePlayback = async () => {
    if (
      !playbackRef.current.sampler ||
      playbackRef.current.currentIndex >= melody.length
    ) {
      return;
    }

    setIsPaused(false);
    onPlaybackStateChange?.(true);
    console.log(
      "Resuming playback from index:",
      playbackRef.current.currentIndex
    );

    // Continue playback from current index
    for (let i = playbackRef.current.currentIndex; i < melody.length; i++) {
      const { note, duration } = melody[i];
      if (!sampleUrls[note]) {
        console.warn(`No sample for ${note}, skipping`);
        continue;
      }
      console.log(`Playing ${note} for ${duration}s`);
      playbackRef.current.sampler!.triggerAttackRelease(note, duration);
      playbackRef.current.currentIndex = i + 1;

      if (i < melody.length - 1) {
        await new Promise((res) => {
          playbackRef.current.timeoutId = setTimeout(res, duration * 1000);
        });
      }
    }

    // Playback finished
    setIsPlaying(false);
    setIsPaused(false);
    playbackRef.current.currentIndex = 0;
    onPlaybackStateChange?.(false);
    console.log("Finished playback");
  };

  const playMelody = async () => {
    // If paused, resume playback
    if (isPaused) {
      resumePlayback();
      return;
    }

    // If already playing, pause
    if (isPlaying) {
      pausePlayback();
      return;
    }

    setIsPlaying(true);
    onPlaybackStateChange?.(true);

    // Fetch sample URLs if we don't have them yet
    let currentSampleUrls = sampleUrls;
    if (Object.keys(currentSampleUrls).length === 0) {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("recordings")
        .select("note, filename");
      if (error) {
        console.error("Supabase fetch error:", error);
        setIsLoading(false);
        setIsPlaying(false);
        onPlaybackStateChange?.(false);
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
      currentSampleUrls = urls;
      setIsLoading(false);
      console.log("Sample URLs:", urls);
    }

    await Tone.start();
    console.log("Audio context started");

    const sampler = new Tone.Sampler({
      urls: currentSampleUrls,
      release: 1,
    }).toDestination();

    playbackRef.current.sampler = sampler;
    playbackRef.current.currentIndex = 0;

    await Tone.loaded();
    console.log("Samples loaded");

    for (let i = 0; i < melody.length; i++) {
      const { note, duration } = melody[i];
      if (!currentSampleUrls[note]) {
        console.warn(`No sample for ${note}, skipping`);
        continue;
      }
      console.log(`Playing ${note} for ${duration}s`);
      sampler.triggerAttackRelease(note, duration);
      playbackRef.current.currentIndex = i + 1;

      if (i < melody.length - 1) {
        await new Promise((res) => {
          playbackRef.current.timeoutId = setTimeout(res, duration * 1000);
        });
      }
    }

    // Playback finished
    setIsPlaying(false);
    setIsPaused(false);
    playbackRef.current.currentIndex = 0;
    onPlaybackStateChange?.(false);
    console.log("Finished playback");
  };

  return (
    <Container>
      <PlaybackContainer>
        <Title>Trill</Title>
        <PlayButton
          onClick={playMelody}
          disabled={isLoading || melody.length === 0 || isRecording}
          isLoading={isLoading}
          isPlaying={isPlaying}
          isPaused={isPaused}
          test="foo"
          aria-label="Play When the Saints Go Marching In"
        >
          {isLoading ? <PlayIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
          <CircularText
            text="When the Saints Go Marching In"
            radius={86}
            startAngle={-160}
            endAngle={80}
          />
        </PlayButton>
        <Details>
          <p>Sampled from {contributorCount} contributors around the world</p>
        </Details>
      </PlaybackContainer>
      <Footer>
        <p>
          Built on <a href="https://supabase.com">Supabase</a> with 🧡 by{" "}
          <a href="https://dannywhite.net">Danny</a>
        </p>
      </Footer>
    </Container>
  );
}

const Container = styled("section")({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--padding-page)",
  "@media (min-width: 768px)": {
    position: "sticky",
    top: "var(--padding-page)", // Match its starting position
    left: 0,
    right: 0,
    bottom: 0,
  },
});

const PlaybackContainer = styled("div")({
  position: "relative",
  aspectRatio: "1 / 1",
  padding: "2rem",
  background: "var(--primary-color)",
  boxShadow: "0 2px 0px 0px rgba(0, 0, 0, 0.045)",
  borderRadius: 12,
  width: "100%",
  maxWidth: "440px",
  height: "100%", // Ensure height constraint
  // maxHeight: "100%",
  "@media (min-width: 768px)": {
    minWidth: "440px",
    width: "50%",
    maxHeight: "50%", // Let aspect ratio control height in row layout
    flexShrink: 0,
  },
});

const Title = styled("h1")({
  position: "absolute", // So it doesn't affect the play button and so on
  color: "rgba(0, 0, 0, 0.2)",
  marginBottom: "0.5rem",
  textTransform: "lowercase",
  fontSize: "4rem",
  fontStyle: "italic",
  fontWeight: 200,
  lineHeight: "100%",
  letterSpacing: "-0.05em",
});

const playButtonAnimation = keyframes({
  from: {
    transform: "translate(50%, -50%) scale(1)",
  },
  to: {
    transform: "translate(50%, -50%) scale(1.1)",
  },
});

const playButtonRotateAnimation = keyframes({
  from: {
    transform: "translate(50%, -50%) rotate(0deg)",
  },
  to: {
    transform: "translate(50%, -50%) rotate(360deg)",
  },
});

const PlayButton = styled("button")<{
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  test: string;
}>(() => ({
  zIndex: 1,
  position: "absolute",
  top: "50%",
  right: "50%",
  transform: "translate(50%, -50%)",
  background: "var(--spot-color)",
  width: "14rem",
  height: "14rem",
  color: "black",
  borderRadius: "50%",
  padding: "0.7rem",
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 0px 0px rgba(0, 0, 0, 0.045)",
  transition: "transform 0.2s ease-in-out",
  animation: "none",

  variants: [
    {
      props: { isLoading: true },
      style: {
        animation: `${playButtonAnimation} 1.5s ease-in-out infinite`,
      },
    },
    {
      props: { isPlaying: true },
      style: {
        animation: `${playButtonRotateAnimation} 10s linear infinite`,
      },
    },
    {
      props: { isPaused: true },
      style: {
        animation: "none",
      },
    },
  ],
}));

const CircularTextContainer = styled("div")({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "0",
  height: "0",
  pointerEvents: "none",
});

const CircularCharacter = styled("span")({
  position: "absolute",
  fontSize: "0.7rem",
  fontWeight: "500",
  color: "var(--tertiary-color)",
  opacity: 0.7,
  textTransform: "uppercase",
  letterSpacing: "-0.7em",
  transformOrigin: "center",
  userSelect: "none",
  lineHeight: "0",
});

// const Controls = styled("div")({
//   background: "var(--spot-color)",
//   padding: "1rem",
//   borderRadius: "12px",
//   position: "absolute",
//   top: "50%",
//   right: "50%",
//   transform: "translate(50%, -50%)",
//   display: "flex",
//   flexDirection: "column",
//   gap: "0.5rem",
//   // alignItems: "flex-end",
// });

const Details = styled("div")({
  position: "absolute",
  bottom: "2rem",
  right: "2rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  alignItems: "flex-end",
});

const Footer = styled("footer")({
  "& p": {
    color: "var(--tertiary-color)",
    textTransform: "uppercase",
    fontSize: "0.8rem",
    letterSpacing: "0.15em",
    textAlign: "center",

    "& a": {
      transition: "color 0.1s ease-in-out",
      "&:hover": {
        color: "var(--primary-color)",
      },
    },
  },
});
