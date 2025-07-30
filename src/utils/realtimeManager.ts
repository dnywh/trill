import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Type for the payload received from realtime broadcasts
export type ButtonPressPayload = {
  note: string;
  contributorId: string;
  timestamp: number;
};

// Create a channel for button press broadcasts
const buttonPressChannel = supabase.channel("button-presses");

// Store callbacks by note
const buttonCallbacks = new Map<
  string,
  (payload: ButtonPressPayload) => void
>();

// Subscribe to the channel
buttonPressChannel
  .on(
    "broadcast",
    { event: "button_press" },
    (payload: { payload: ButtonPressPayload }) => {
      const { note } = payload.payload;

      // Call the specific callback for this note
      if (buttonCallbacks.has(note)) {
        try {
          buttonCallbacks.get(note)!(payload.payload);
        } catch (error) {
          console.error("Error in button press callback:", error);
        }
      }
    }
  )
  .subscribe((status) => {
    console.log("Realtime channel status:", status);

    // Handle connection errors
    if (status === "CHANNEL_ERROR") {
      console.error("Realtime channel error - attempting to reconnect...");
    }
  });

// Function to send a button press broadcast
export function broadcastButtonPress(
  note: string,
  contributorId: string
): void {
  try {
    buttonPressChannel.send({
      type: "broadcast",
      event: "button_press",
      payload: {
        note: note,
        contributorId: contributorId,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error("Error broadcasting button press:", error);
  }
}

// Function to subscribe to button press events for a specific note
export function subscribeToButtonPresses(
  note: string,
  callback: (payload: ButtonPressPayload) => void
): () => void {
  buttonCallbacks.set(note, callback);

  // Return unsubscribe function
  return () => {
    buttonCallbacks.delete(note);
  };
}

// Function to cleanup all subscriptions (useful for testing or app shutdown)
export function cleanupRealtime(): void {
  buttonCallbacks.clear();
  buttonPressChannel.unsubscribe();
}
