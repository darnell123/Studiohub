import React from 'react';
import {Frame, useAnim} from '../components/Frame';
import {theme} from '../theme';
import type {TimelineParams} from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const toN = (d: string) => {
  const [y, m = '1', day = '1'] = d.split('-');
  return Number(y) * 12 + (Number(m) - 1) + (Number(day) - 1) / 31;
};
export const longDate = (d: string) => {
  const [y, m, day] = d.split('-');
  if (!m) return y;
  return day ? `${FULL[Number(m) - 1]} ${Number(day)}, ${y}` : `${FULL[Number(m) - 1]} ${y}`;
};

export const TimelineScene: React.FC<TimelineParams> = ({title, tag, from, to, spans = [], markers = [], source}) => {
  const {t} = useAnim();
  const x0 = theme.margin + 40;
  const x1 = theme.width - theme.margin - 40;
  const y = 600;
  const all = [from, to, ...spans.flatMap((s) => [s.from, s.to]), ...markers.map((m) => m.date)].filter(Boolean) as string[];
  let a = from ? toN(from) : Math.min(...all.map(toN));
  let b = to ? toN(to) : Math.max(...all.map(toN));
  const openEnded = spans.some((s) => !s.to);
  if (b - a < 12) {
    a -= 8;
    b += 8;
  }
  if (openEnded && !to) b += 18;
  // pad the axis by ~6% on each side so endpoints aren't on the edge
  const pad = Math.max(2, (b - a) * 0.06);
  const lo = a - pad;
  const hi = b + pad;
  const X = (d: string) => x0 + ((toN(d) - lo) / (hi - lo)) * (x1 - x0);
  const xEnd = x0 + ((b - lo) / (hi - lo)) * (x1 - x0);

  const axis = t(0.4, 1.0);
  const years: number[] = [];
  for (let yr = Math.ceil(lo / 12); yr * 12 <= hi; yr++) years.push(yr);

  return (
    <Frame title={title} tag={tag} source={source}>
      <svg width={theme.width} height={theme.height} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="fadeR" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0.75" stopColor={theme.accent} />
            <stop offset="1" stopColor={theme.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * axis} y2={y} stroke={theme.border} strokeWidth={4} strokeLinecap="round" />
        {years.map((yr, i) => {
          const x = X(`${yr}-01`);
          const o = t(0.6 + i * 0.08, 0.4);
          return (
            <g key={yr} opacity={o}>
              <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke={theme.dim} strokeWidth={2} />
              <text x={x} y={y + 56} fill={theme.muted} fontSize={28} textAnchor="middle" fontFamily={theme.font}>
                {yr}
              </text>
            </g>
          );
        })}
        {spans.map((s, i) => {
          const sx = X(s.from);
          const ex = s.to ? X(s.to) : xEnd;
          const p = t(1.4 + i * 0.6, 1.6);
          const lbl = t(2.8 + i * 0.6, 0.5);
          const sy = y - 70 - i * (spans.length > 1 ? 130 : 70);
          return (
            <g key={i}>
              <rect x={sx} y={sy - 14} width={(ex - sx) * p} height={28} rx={14} fill={s.to ? theme.accent : 'url(#fadeR)'} />
              <circle cx={sx} cy={sy} r={10 * Math.min(1, p * 4)} fill={theme.text} />
              {p >= 1 && s.to && <circle cx={ex} cy={sy} r={10} fill={theme.text} />}
              <g opacity={t(1.4 + i * 0.6, 0.4)}>
                <text x={sx} y={sy - 40} fill={theme.text} fontSize={34} fontWeight={700} fontFamily={theme.font}>
                  {longDate(s.from)}
                </text>
                <line x1={sx} y1={sy} x2={sx} y2={y} stroke={theme.accent} strokeWidth={2} strokeDasharray="4 6" />
              </g>
              <g opacity={lbl}>
                {s.to && (
                  <>
                    <text x={ex} y={sy - 40} fill={theme.text} fontSize={34} fontWeight={700} textAnchor="end" fontFamily={theme.font}>
                      {longDate(s.to)}
                    </text>
                    <line x1={ex} y1={sy} x2={ex} y2={y} stroke={theme.accent} strokeWidth={2} strokeDasharray="4 6" />
                  </>
                )}
                <text x={spans.length > 1 ? ex - 10 : (sx + ex) / 2} y={spans.length > 1 ? sy - 40 : y + 150} fill={theme.accent} fontSize={spans.length > 1 ? 32 : 40} fontWeight={700} textAnchor={spans.length > 1 ? 'end' : 'middle'} fontFamily={theme.font}>
                  {s.label}
                </text>
              </g>
            </g>
          );
        })}
        {markers.map((m, i) => {
          const x = X(m.date);
          const p = t(1.4 + spans.length * 0.6 + i * 0.5, 0.6);
          const up = i % 2 === 0;
          return (
            <g key={i} opacity={p}>
              <line x1={x} y1={y} x2={x} y2={up ? y - 150 * p : y + 150 * p} stroke={theme.accent} strokeWidth={3} />
              <circle cx={x} cy={y} r={14} fill={theme.accent} stroke={theme.canvas} strokeWidth={4} />
              <text x={x} y={up ? y - 200 : y + 200} fill={theme.text} fontSize={36} fontWeight={700} textAnchor="middle" fontFamily={theme.font}>
                {longDate(m.date)}
              </text>
              <text x={x} y={up ? y - 162 : y + 238} fill={theme.muted} fontSize={28} textAnchor="middle" fontFamily={theme.font}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
};
export {MONTHS};
