import React, {createContext, useContext} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {theme} from '../theme';

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Global animation speed: 0.5 = every build-in takes half the time written in the templates. */
export const SPEED = 0.5;

/** Lets a template know its own length when it is placed inside a longer timeline (rough cut). */
export const CueDuration = createContext<number | null>(null);

export const useAnim = () => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const fps = config.fps;
  const durationInFrames = useContext(CueDuration) ?? config.durationInFrames;
  /** 0→1 progress between two times in seconds (all template timings are scaled by SPEED) */
  const t = (startSec: number, lenSec = 0.6) =>
    interpolate(frame, [startSec * SPEED * fps, (startSec + lenSec) * SPEED * fps], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: ease,
    });
  // No fade-out: clips end on the finished graphic; transitions are the editor's job (crossfade in the rough cut, CapCut otherwise).
  const out = 1;
  return {frame, fps, durationInFrames, t, out, sec: frame / fps};
};

export const Frame: React.FC<{title?: string; tag?: string; source?: string; children: React.ReactNode; fade?: boolean}> = ({
  title,
  tag,
  source,
  children,
  fade = true,
}) => {
  const {t, out} = useAnim();
  const titleIn = t(0.1, 0.7);
  return (
    <AbsoluteFill style={{background: theme.canvas, fontFamily: theme.font, color: theme.text}}>
      {/* soft vignette */}
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(223,179,113,0.05) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)'}}
      />
      <AbsoluteFill style={{opacity: fade ? out : 1}}>
        {children}
        {(title || tag) && (
          <div
            style={{
              position: 'absolute',
              left: theme.margin,
              top: 90,
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 16}px)`,
            }}
          >
            {tag && (
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: theme.accent,
                  border: `2px solid ${theme.accent}`,
                  borderRadius: 6,
                  padding: '6px 14px',
                  marginBottom: 18,
                }}
              >
                {tag.toUpperCase()}
              </div>
            )}
            {title && <div style={{fontSize: 52, fontWeight: 700, letterSpacing: -0.5, maxWidth: 1500}}>{title}</div>}
          </div>
        )}
        {source && (
          <div
            style={{
              position: 'absolute',
              left: theme.margin,
              bottom: 70,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 24,
              color: theme.muted,
              opacity: t(0.6, 0.8),
            }}
          >
            <div style={{width: 36, height: 3, background: theme.accent}} />
            {source}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
