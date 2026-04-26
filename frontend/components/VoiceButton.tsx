type VoiceButtonProps = {
  state: "idle" | "connecting" | "recording" | "stopping" | "error";
  onClick: () => void;
  disabled?: boolean;
};

const labelByState: Record<VoiceButtonProps["state"], string> = {
  idle: "VOICE",
  connecting: "LINKING",
  recording: "LISTENING",
  stopping: "SAVING",
  error: "RETRY",
};

export function VoiceButton({ state, onClick, disabled = false }: VoiceButtonProps) {
  return (
    <button
      className="voice-button"
      type="button"
      aria-label="Start voice input"
      data-state={state}
      onClick={onClick}
      disabled={disabled}
    >
      {labelByState[state]}
    </button>
  );
}
