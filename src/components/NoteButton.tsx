import { styled } from "@pigment-css/react";
import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";
import { createClient } from "@supabase/supabase-js";
import { transformNoteForDatabase } from "../utils/noteExtractor";
import { checkAudioQuality } from "../utils/audioQualityCheck";
import {
  broadcastButtonPress,
  subscribeToButtonPresses,
} from "../utils/realtimeManager";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// Type for the payload received from realtime broadcasts
type ButtonPressPayload = {
  note: string;
  contributorId: string;
  timestamp: number;
};

type NoteButtonProps = {
  note: string;
  onPlay?: () => void;
  contributorId: string;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
  isRecording: boolean;
  isAlreadyRecorded?: boolean;
};

type ButtonState =
  | "idle"
  | "listening"
  | "recording"
  | "checking"
  | "thanks"
  | "success"
  | "failed";

export default function NoteButton({
  note,
  //   onPlay,
  contributorId,
  onRecordingStart,
  onRecordingEnd,
  isRecording,
  isAlreadyRecorded = false,
}: NoteButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isRemotePressed, setIsRemotePressed] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>(
    isAlreadyRecorded ? "success" : "idle"
  );
  const [synth, setSynth] = useState<Tone.Synth | null>(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remotePressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const newSynth = new Tone.Synth().toDestination();
    setSynth(newSynth);

    // Subscribe to remote button presses for this specific note
    const unsubscribe = subscribeToButtonPresses(
      note,
      (payload: ButtonPressPayload) => {
        // Only respond to presses from other users
        if (payload.contributorId !== contributorId) {
          console.log(
            `Remote button press: ${note} from ${payload.contributorId}`
          );

          // Clear any existing remote press timeout
          if (remotePressTimeoutRef.current) {
            clearTimeout(remotePressTimeoutRef.current);
          }

          setIsRemotePressed(true);

          // Clear remote pressed state after a short time
          remotePressTimeoutRef.current = setTimeout(() => {
            setIsRemotePressed(false);
          }, 200);
        }
      }
    );

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (failedTimeoutRef.current) {
        clearTimeout(failedTimeoutRef.current);
      }
      if (remotePressTimeoutRef.current) {
        clearTimeout(remotePressTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [note, contributorId]);

  // Update button state when isAlreadyRecorded changes
  useEffect(() => {
    if (isAlreadyRecorded) {
      setButtonState("success");
    }
  }, [isAlreadyRecorded]);

  const playNote = async (note: string) => {
    if (!synth) return;
    try {
      if (!isAudioStarted) {
        await Tone.start();
        setIsAudioStarted(true);
        console.log("Audio context started");
      }
      synth.triggerAttackRelease(note, "2n");
      console.log(`Playing note: ${note}`);
    } catch (error) {
      console.error("Error playing note:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        chunks.push(event.data);
      };
      recorder.onstop = async () => {
        console.log("onstop callback triggered");
        const blob = new Blob(chunks, { type: "audio/wav" });
        setButtonState("checking");
        await uploadRecording(blob);
        console.log(`Recording completed for ${note}`);
      };
      recorder.start();
      console.log(`Kicking off recording for ${note}`);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = chunks;
      setButtonState("recording");
      onRecordingStart?.();
      console.log(`Started recording ${note}`);
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 3000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setButtonState("idle");
    }
  };

  const stopRecording = () => {
    console.log("stopRecording called");
    if (mediaRecorderRef.current) {
      console.log("Stopping recording...");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    onRecordingEnd?.();
  };

  const uploadRecording = async (blob: Blob) => {
    try {
      console.log("Checking audio quality...");

      // Check audio quality before uploading
      const qualityResult = await checkAudioQuality(blob, note);
      console.log("Quality check result:", qualityResult);

      if (!qualityResult.isMatch) {
        console.log("Audio quality check failed:", qualityResult.message);
        setFailureMessage(qualityResult.message);
        setButtonState("failed");

        // Reset to idle state after 3 seconds
        failedTimeoutRef.current = setTimeout(() => {
          setButtonState("idle");
          setFailureMessage("");
        }, 3000);

        return;
      }

      setButtonState("thanks");

      // Transition to done state after 3 seconds
      setTimeout(() => {
        setButtonState("success");
      }, 3000);

      console.log("Audio quality check passed, uploading recording...");
      const dbNote = transformNoteForDatabase(note);
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const { error: uploadError } = await supabase.storage
        .from("recordings")
        .upload(`${dbNote}/${filename}.wav`, blob);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        return;
      }
      const { error: dbError } = await supabase.from("recordings").insert({
        note: dbNote,
        filename: filename,
        created_at: new Date().toISOString(),
        contributor_id: contributorId,
      });
      if (dbError) {
        console.error("Database error:", dbError);
        return;
      }
      console.log(`Recording uploaded successfully for ${note}`);
    } catch (error) {
      console.error("Error uploading recording:", error);
    }
  };

  const handleClick = async () => {
    // Add this check at the beginning
    if (isRecording) {
      console.log("Another recording is in progress, ignoring click");
      return;
    }

    if (
      buttonState !== "idle" &&
      buttonState !== "failed" &&
      buttonState !== "listening" &&
      buttonState !== "success" &&
      buttonState !== "thanks"
    )
      return;

    // Clear any existing failed timeout
    if (failedTimeoutRef.current) {
      clearTimeout(failedTimeoutRef.current);
      failedTimeoutRef.current = null;
    }

    console.log(`NoteButton clicked: ${note}`);

    // Broadcast the button press to other users
    broadcastButtonPress(note, contributorId);

    // Immediately notify that recording is starting to disable other buttons
    onRecordingStart?.();

    await playNote(note);
    setButtonState("listening");
    setFailureMessage("");
    timeoutRef.current = setTimeout(() => {
      startRecording();
    }, 1500);
  };

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  const getButtonText = () => {
    switch (buttonState) {
      case "listening":
        return "Sing this tune";
      case "recording":
        return "Keep singing...";
      case "checking":
        return "Checking...";
      case "thanks":
        return "Done";
      case "success":
        return note;
      case "failed":
        return failureMessage || "Try again";
      default:
        return note;
    }
  };

  const getButtonClassName = () => {
    const classes: string[] = [];
    if (isPressed) classes.push("pressed");
    if (isRemotePressed) {
      classes.push("remote-pressed"); // Remote presses also show as pressed
    }
    if (buttonState === "listening") classes.push("listening");
    if (buttonState === "recording") classes.push("recording");
    if (buttonState === "checking") classes.push("checking");
    if (buttonState === "thanks") classes.push("thanks");
    if (buttonState === "success") classes.push("success");
    if (buttonState === "failed") classes.push("failed");

    return classes.join(" ");
  };

  // Add a debug effect to monitor state changes
  // useEffect(() => {
  //   console.log(`isRemotePressed changed for ${note}: ${isRemotePressed}`);
  // }, [isRemotePressed, note]);

  return (
    <StyledButton
      className={getButtonClassName()}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={
        isRecording ||
        buttonState === "listening" ||
        buttonState === "recording" ||
        buttonState === "checking"
      }
    >
      {getButtonText()}
    </StyledButton>
  );
}

const StyledButton = styled("button")({
  width: "100%",
  height: "100%",
  padding: "0.8rem 1.2rem",
  fontSize: "1rem",
  letterSpacing: "0.05em",
  fontWeight: 400,
  borderRadius: 8,
  border: "none",
  background: "var(--spot-color-white)",
  color: "var(--tertiary-color)",
  cursor: "pointer",
  transition: "all 0.15s ease",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",

  lineHeight: "120%",
  wordBreak: "break-word",
  boxShadow:
    "0 2px 0px 0px rgba(0, 0, 0, 0.015), 0 1px 0 1px rgba(0, 0, 0, 0.02), 0 1.5px 0 2px rgba(0, 0, 0, 0.01)",

  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow:
      "0 3px 1px 1px rgba(0, 0, 0, 0.06), 0 4px 5px 2px rgba(0, 0, 0, 0.04)",
    "&:not(.listening):not(.recording):not(.checking):not(.thanks):not(.success)":
      {
        color: "var(--primary-color)",
      },
  },

  "&:disabled": {
    cursor: "not-allowed",
    opacity: 0.7,
  },
  "&.pressed, &.listening, &.recording, &.checking": {
    background: "var(--button-color-pressed)",
    transform: "translateY(1px)",
    boxShadow:
      "0 1px 0 1px rgba(0, 0, 0, 0.02), 0 1px 0.5px 2px rgba(0, 0, 0, 0.05) inset",
  },
  "&.pressed, &.listening, &.recording, &.checking, &.thanks, &.failed": {
    letterSpacing: "-0.008em",
  },
  "&.remote-pressed": {
    background: "var(--button-color-remote-pressed)",
    transform: "translateY(1px)",
    boxShadow:
      "0 1px 0 1px rgba(0, 0, 0, 0.02), 0 1px 0.5px 2px rgba(0, 0, 0, 0.05) inset",
  },
  "&.recording": {
    "&::after": {
      content: '""',
      position: "absolute",
      top: "9px",
      left: "9px",
      width: "7px",
      height: "7px",
      borderRadius: "50%",
      background: "var(--spot-color-red)",
    },
  },
  "&.success, &.thanks": {
    position: "relative",
    "&::after": {
      content: '""',
      position: "absolute",
      top: "9px",
      left: "9px",
      width: "7px",
      height: "7px",
      borderRadius: "50%",
      background: "var(--state-color-success)",
    },
  },
});
