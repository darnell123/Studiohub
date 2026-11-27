import React from 'react';
import {Frame, useAnim} from '../components/Frame';
import {Glyph} from '../components/Glyphs';
import {theme} from '../theme';
import type {CounterParams, Stat} from '../types';

const fmt = (s: Stat, p: number) => {
  const v = (s.value ?? 0) * p;
  const d = s.decimals ?? 0;
  return v.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
};

const StatBlock: React.FC<{s: Stat; start: number; size: number; maxWidth?: number}> = ({s, start, size, maxWidth}) => {
  const {t} = useAnim();
  const appear = t(start, 0.5);
  const count = t(start, 2.0);
  return (
    <div style={{opacity: appear, transform: `translateY(${(1 - appear) * 24}px)`, maxWidth}}>
      {s.qualifier && <div style={{fontSize: size * 0.2, color: theme.accent, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase'}}>{s.qualifier}</div>}
      <div style={{fontSize: size, fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', letterSpacing: -2}}>
        <span style={{color: theme.accent}}>{s.prefix}</span>
        {s.text ?? fmt(s, count)}
        {s.suffix && <span style={{fontSize: size * 0.45, fontWeight: 700, color: theme.accent, marginLeft: size * 0.06}}>{s.suffix}</span>}
      </div>
      <div style={{fontSize: Math.max(28, size * 0.2), color: theme.muted, marginTop: 8}}>{s.label}</div>
    </div>
  );
};

export const CounterScene: React.FC<CounterParams> = ({title, stats, icons, source, tag}) => {
  const {t} = useAnim();
  const single = stats.length === 1;
  const grid = (icons?.count ?? 0) > 6;

  return (
    <Frame title={title} tag={tag} source={source}>
      {single ? (
        <div style={{position: 'absolute', left: theme.margin, top: title ? 330 : 280}}>
          <StatBlock s={stats[0]} start={0.5} size={260} maxWidth={icons ? 780 : 1500} />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            left: theme.margin,
            right: theme.margin,
            top: title || tag ? 260 : 180,
            bottom: 150,
            display: 'grid',
            alignContent: 'center',
            gridTemplateColumns: stats.length === 4 ? '1fr 1fr' : `repeat(${stats.length}, 1fr)`,
            rowGap: 70,
            columnGap: 80,
          }}
        >
          {stats.map((s, i) => (
            <div key={i} style={{borderLeft: `3px solid ${theme.border}`, paddingLeft: 36}}>
              <StatBlock s={s} start={0.5 + i * 0.45} size={stats.length === 4 ? 120 : 140} />
            </div>
          ))}
        </div>
      )}
      {icons && !grid && (
        <div style={{position: 'absolute', right: theme.margin, top: single ? 420 : 760, textAlign: 'right'}}>
          <div style={{display: 'flex', gap: 34, justifyContent: 'flex-end'}}>
            {Array.from({length: icons.count}).map((_, i) => {
              const a = t(2.2 + i * 0.3, 0.45);
              return (
                <div key={i} style={{opacity: a, transform: `scale(${0.6 + 0.4 * a})`}}>
                  <Glyph name={icons.glyph} size={130} />
                </div>
              );
            })}
          </div>
          {icons.label && (
            <div style={{marginTop: 24, opacity: t(2.4 + icons.count * 0.3, 0.5)}}>
              {icons.qualifier && <span style={{fontSize: 30, color: theme.accent, fontWeight: 700, marginRight: 12}}>{icons.qualifier}</span>}
              <span style={{fontSize: 34, color: theme.text, fontWeight: 600}}>{icons.label}</span>
            </div>
          )}
        </div>
      )}
      {icons && grid && <IconGrid count={icons.count} glyph={icons.glyph} label={icons.label} qualifier={icons.qualifier} />}
    </Frame>
  );
};

// Many small icons filling the right half, appearing in step with the count-up (0.5s → 2.5s).
const IconGrid: React.FC<{count: number; glyph: string; label?: string; qualifier?: string}> = ({count, glyph, label, qualifier}) => {
  const {t} = useAnim();
  const W = 820;
  const H = 520;
  const cols = Math.ceil(Math.sqrt((count * W) / H));
  const rows = Math.ceil(count / cols);
  const cell = Math.min(W / cols, H / rows);
  const shown = t(0.5, 2.0) * count;
  return (
    <div style={{position: 'absolute', right: theme.margin, top: 300, width: W}}>
      <div style={{display: 'flex', flexWrap: 'wrap', width: cols * cell, marginLeft: 'auto'}}>
        {Array.from({length: count}).map((_, i) => {
          const a = Math.max(0, Math.min(1, shown - i));
          return (
            <div key={i} style={{width: cell, height: cell, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a, transform: `scale(${0.5 + 0.5 * a})`}}>
              <Glyph name={glyph} size={cell * 0.78} strokeWidth={cell < 50 ? 4.5 : 3.5} />
            </div>
          );
        })}
      </div>
      {label && (
        <div style={{marginTop: 24, textAlign: 'right', opacity: t(2.4, 0.5)}}>
          {qualifier && <span style={{fontSize: 30, color: theme.accent, fontWeight: 700, marginRight: 12}}>{qualifier}</span>}
          <span style={{fontSize: 32, color: theme.text, fontWeight: 600}}>{label}</span>
        </div>
      )}
    </div>
  );
};
