import React from 'react';
import {Frame, useAnim, SPEED} from '../components/Frame';
import {theme} from '../theme';
import type {TextParams} from '../types';

export const TextCard: React.FC<TextParams> = ({kicker, lines, style, mode, attribution, finale}) => {
  const {t: tScaled, sec, durationInFrames, fps} = useAnim();
  const t = tScaled;
  // sequence mode times are real seconds within the clip, so undo the global SPEED scaling for them
  const rt = (start: number, len: number) => tScaled(start / SPEED, len);
  const total = durationInFrames / fps;
  const slots = lines.length + (finale ? 1 : 0);
  const slot = (total - 0.4) / slots;

  const size = style === 'title' ? 96 : style === 'quote' ? 76 : style === 'list' ? 60 : 72;

  const renderLine = (text: string, i: number, appear: number, leave: number) => (
    <div
      key={i}
      style={{
        fontSize: size,
        fontWeight: style === 'title' ? 800 : 600,
        lineHeight: 1.18,
        letterSpacing: -1,
        maxWidth: 1500,
        opacity: appear * (1 - leave),
        transform: `translateY(${(1 - appear) * 28 - leave * 20}px)`,
        fontStyle: style === 'quote' ? 'italic' : 'normal',
      }}
    >
      {style === 'list' && <span style={{color: theme.accent, fontWeight: 800, marginRight: 28, fontVariantNumeric: 'tabular-nums'}}>{i + 1}</span>}
      {style === 'quote' && <span style={{color: theme.accent}}>“</span>}
      {text}
      {style === 'quote' && <span style={{color: theme.accent}}>”</span>}
    </div>
  );

  return (
    <Frame>
      <div
        style={{
          position: 'absolute',
          left: theme.margin + 60,
          right: theme.margin + 60,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 40,
        }}
      >
        <div style={{position: 'absolute', left: -60, top: '38%', width: 6, height: '24%', background: theme.accent, opacity: t(0.1, 0.6) * (finale ? 1 - rt(lines.length * slot - 0.3, 0.3) : 1)}} />
        {kicker && (
          <div style={{fontSize: 26, fontWeight: 700, letterSpacing: 4, color: theme.accent, opacity: t(0.1, 0.5)}}>{kicker.toUpperCase()}</div>
        )}
        {mode === 'stack'
          ? lines.map((l, i) => renderLine(l, i, t(0.3 + i * 0.6, 0.7), 0))
          : lines.map((l, i) => {
              const start = i * slot;
              if (sec < start - 0.1 || sec > start + slot + 0.1) return null;
              const isLastShown = i === lines.length - 1 && !finale;
              const leave = isLastShown ? 0 : rt(start + slot - 0.35, 0.35);
              return (
                <div key={i} style={{position: 'absolute', top: '50%', transform: 'translateY(-50%)'}}>
                  {renderLine(l, i, rt(start + 0.05, 0.6), leave)}
                </div>
              );
            })}
        {finale === 'blank-prompt' && sec >= lines.length * slot - 0.1 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${0.92 + 0.08 * rt(lines.length * slot, 0.6)})`,
              opacity: rt(lines.length * slot, 0.6),
              width: 760,
              height: 380,
              borderRadius: 22,
              background: theme.panel,
              border: `2px solid ${theme.border}`,
              boxShadow: '0 40px 120px rgba(0,0,0,0.5)',
              padding: 48,
              boxSizing: 'border-box',
            }}
          >
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
              <rect x="14" y="28" width="36" height="28" rx="4" stroke={theme.accent} strokeWidth="4" />
              <path d="M22 28v-8a10 10 0 0120 0v8" stroke={theme.accent} strokeWidth="4" />
            </svg>
            <div style={{marginTop: 30, height: 22, width: 460, borderRadius: 11, background: theme.elevated}} />
            <div style={{marginTop: 18, height: 22, width: 320, borderRadius: 11, background: theme.elevated}} />
            <div style={{position: 'absolute', right: 48, bottom: 48, display: 'flex', gap: 20}}>
              <div style={{width: 150, height: 58, borderRadius: 12, border: `2px solid ${theme.border}`}} />
              <div style={{width: 150, height: 58, borderRadius: 12, border: `2px solid ${theme.accent}`}} />
            </div>
          </div>
        )}
        {attribution && (
          <div style={{fontSize: 28, color: theme.muted, opacity: t(0.9, 0.6)}}>— {attribution}</div>
        )}
      </div>
    </Frame>
  );
};
