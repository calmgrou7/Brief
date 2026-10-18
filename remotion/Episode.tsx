import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type EpisodeProps = { episode: number; title: string; subtitle: string };

export const Episode = ({ episode, title, subtitle }: EpisodeProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const progress = interpolate(frame, [0, durationInFrames], [0, 1]);

  return (
    <AbsoluteFill style={{ background: "#0a0a0a", color: "#f4f4f5", padding: 96, justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 40, letterSpacing: 4, color: "#a1a1aa" }}>EP.{String(episode).padStart(2, "0")}</div>
      <div style={{ fontSize: 140, fontWeight: 800, transform: `translateY(${(1 - enter) * 80}px)`, opacity: enter }}>{title}</div>
      <div style={{ fontSize: 56, color: "#a1a1aa", marginTop: 16 }}>{subtitle}</div>
      <div style={{ marginTop: 64, height: 12, background: "#27272a", borderRadius: 6 }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: "#ef4444", borderRadius: 6 }} />
      </div>
    </AbsoluteFill>
  );
};
