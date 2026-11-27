import React from 'react';
import {AbsoluteFill, Audio, Sequence, getStaticFiles, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Cue} from './Cue';
import {CueDuration, Frame, useAnim} from './components/Frame';
import {theme} from './theme';
import type {CueSpec} from './types';

export type TimelineShot = {
  shot: number;
  scene: string;
  type: string;
  timecode: string;
  start: number;
  end: number;
  note?: string;
} & ({kind: 'graphic'; template: CueSpec['template']; params: CueSpec['params']} | {kind: 'placeholder'; whatToShow: string; searchTerms: string; needsLicensing: string});

export type Timeline = {
  film: string;
  title: string;
  fps: number;
  durationSec: number;
  review: boolean;
  chapters: {title: string; start: number}[];
  narration: {start: number; dur: number; text: string}[];
  shots: TimelineShot[];
};

const Placeholder: React.FC<{s: Extract<TimelineShot, {kind: 'placeholder'}>}> = ({s}) => {
  const {t} = useAnim();
  return (
    <Frame>
      <div style={{position: 'absolute', inset: 70, border: `3px dashed ${theme.border}`, borderRadius: 24}} />
      <div style={{position: 'absolute', left: theme.margin + 40, right: theme.margin + 40, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, opacity: t(0, 0.4)}}>
        <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
          <div style={{fontSize: 26, fontWeight: 700, letterSpacing: 3, color: theme.canvas, background: theme.muted, borderRadius: 6, padding: '6px 14px'}}>
            {s.type.toUpperCase()}
          </div>
          {s.needsLicensing === 'Yes' && (
            <div style={{fontSize: 22, fontWeight: 700, letterSpacing: 2, color: theme.accent, border: `2px solid ${theme.accent}`, borderRadius: 6, padding: '5px 12px'}}>
              NEEDS LICENSING
            </div>
          )}
        </div>
        <div style={{fontSize: 46, fontWeight: 600, lineHeight: 1.3, color: theme.text, maxWidth: 1500}}>{s.whatToShow}</div>
        <div style={{fontSize: 26, color: theme.dim}}>Search: {s.searchTerms}</div>
      </div>
    </Frame>
  );
};

const Badge: React.FC<{s: TimelineShot}> = ({s}) => (
  <div
    style={{
      position: 'absolute',
      right: 28,
      top: 24,
      fontFamily: theme.font,
      fontSize: 22,
      fontWeight: 700,
      color: theme.canvas,
      background: 'rgba(241,236,224,0.85)',
      borderRadius: 8,
      padding: '6px 12px',
    }}
  >
    Shot {s.shot} · {s.type}
    {s.note ? ` · ${s.note}` : ''}
  </div>
);

const hasVoice = () => {
  try {
    return getStaticFiles().some((f) => f.name === 'vo.wav');
  } catch {
    return false;
  }
};

const XFADE = 8; // frames of crossfade between shots (~0.27s)

/** Fades its children in over the first XFADE frames of the enclosing Sequence (the shot below stays visible underneath). */
const FadeIn: React.FC<{children: React.ReactNode; on: boolean}> = ({children, on}) => {
  const frame = useCurrentFrame();
  const o = on ? interpolate(frame, [0, XFADE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const RoughCut: React.FC<{timeline: Timeline; clean?: boolean}> = ({timeline, clean = false}) => {
  const {fps} = useVideoConfig();
  const f = (sec: number) => Math.round(sec * fps);
  const review = timeline.review && !clean;
  return (
    <AbsoluteFill style={{background: theme.canvas}}>
      {timeline.shots.map((s, i) => {
        // start each shot XFADE frames early and fade it in over the previous one → crossfade, never a dip to black
        const lead = i === 0 ? 0 : XFADE;
        const from = f(s.start) - lead;
        const dur = Math.max(1, f(s.end) - from);
        return (
          <Sequence key={s.shot} from={from} durationInFrames={dur} name={`Shot ${s.shot} · ${s.type}`}>
            <FadeIn on={lead > 0}>
            <CueDuration.Provider value={dur}>
              {s.kind === 'graphic' ? (
                <Cue {...({template: s.template, params: s.params, durationSec: dur / fps} as React.ComponentProps<typeof Cue>)} />
              ) : (
                <Placeholder s={s} />
              )}
            </CueDuration.Provider>
            {review && <Badge s={s} />}
            </FadeIn>
          </Sequence>
        );
      })}
      {/* Renders are silent (the sound is laid under them afterwards); Remotion Studio plays the film's audio/vo.wav
          when started with `npm run studio -- <film>`, which makes that folder the public dir. */}
      {hasVoice() && <Audio src={staticFile('vo.wav')} />}
    </AbsoluteFill>
  );
};
