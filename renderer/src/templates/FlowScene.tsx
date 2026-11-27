import React from 'react';
import {Frame, useAnim} from '../components/Frame';
import {Glyph} from '../components/Glyphs';
import {theme} from '../theme';
import type {FlowParams, FlowNode} from '../types';

type Box = {x: number; y: number; w: number; h: number; appear: number};

export const FlowScene: React.FC<FlowParams> = ({title, tag, source, layout = 'columns', direction = 'right', nodes, edges, hub, caption}) => {
  const {t} = useAnim();
  const top = title || tag ? 300 : 200;
  const bottom = 930;
  const left = theme.margin;
  const right = theme.width - theme.margin;

  const boxes: Record<string, Box> = {};
  let compact = false;
  let vertical = false;

  if (layout === 'hub') {
    const center = nodes.find((n) => n.id === hub) ?? nodes[0];
    const others = nodes.filter((n) => n !== center);
    const cx = theme.width / 2;
    const cy = (top + bottom) / 2;
    const w = 320;
    const h = 160;
    boxes[center.id] = {x: cx - w / 2, y: cy - h / 2, w, h, appear: 0.5};
    const rx = Math.min(640, (right - left) / 2 - w / 2);
    const ry = Math.max(260, (bottom - top) / 2 - h / 2 + 30);
    others.forEach((n, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / others.length + (others.length % 2 === 0 ? Math.PI / others.length : 0);
      const x = cx + rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      boxes[n.id] = {x: x - w / 2, y: y - h / 2, w, h, appear: 1.1 + i * 0.45};
    });
    vertical = true;
  } else {
    const cols: FlowNode[][] = [];
    nodes.forEach((n, i) => {
      const c = n.col ?? i;
      (cols[c] ??= []).push(n);
    });
    const ncols = cols.length;
    const maxRows = Math.max(...cols.map((c) => c?.length ?? 0));
    if (direction === 'right') {
      const span = (right - left) / ncols;
      compact = maxRows >= 3;
      const labelled = (edges ?? []).some((e) => e.label);
      const w = Math.min(compact ? 440 : 360, span - (labelled ? 160 : 100));
      const rowSpan = (bottom - top) / maxRows;
      const h = compact ? Math.min(130, rowSpan - 26) : Math.min(230, rowSpan - 40);
      cols.forEach((col, ci) =>
        col?.forEach((n, ri) => {
          const cx = left + span * (ci + 0.5);
          const cy = (top + bottom) / 2 + (ri - (col.length - 1) / 2) * Math.max(h + 30, rowSpan);
          boxes[n.id] = {x: cx - w / 2, y: cy - h / 2, w, h, appear: 0.5 + ci * 0.6 + ri * 0.2};
        }),
      );
      vertical = !compact;
    } else {
      const span = (bottom - top) / ncols;
      const h = Math.min(130, span * 0.55);
      cols.forEach((col, ci) =>
        col?.forEach((n, ri) => {
          const w = Math.min(520, (right - left) / col.length - 40);
          const cy = top + span * (ci + 0.5);
          const cx = theme.width / 2 + (ri - (col.length - 1) / 2) * (w + 40);
          boxes[n.id] = {x: cx - w / 2, y: cy - h / 2, w, h, appear: 0.5 + ci * 0.6 + ri * 0.2};
        }),
      );
      compact = true;
    }
  }

  // default edges: column chain (each node → every node in the next column) or satellites → hub
  const E: NonNullable<FlowParams['edges']> =
    edges ??
    (layout === 'hub'
      ? nodes.filter((n) => n.id !== (hub ?? nodes[0].id)).map((n) => ({from: n.id, to: hub ?? nodes[0].id}))
      : nodes.flatMap((a, i) => nodes.filter((b, j) => (b.col ?? j) === (a.col ?? i) + 1).map((b) => ({from: a.id, to: b.id}))));

  const anchor = (b: Box, toward: {x: number; y: number}) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const dx = toward.x - cx;
    const dy = toward.y - cy;
    const sx = Math.abs(dx) / (b.w / 2 + 14);
    const sy = Math.abs(dy) / (b.h / 2 + 14);
    const s = Math.max(sx, sy) || 1;
    return {x: cx + dx / s, y: cy + dy / s};
  };
  const center = (b: Box) => ({x: b.x + b.w / 2, y: b.y + b.h / 2});

  return (
    <Frame title={title} tag={tag} source={source}>
      <svg width={theme.width} height={theme.height} style={{position: 'absolute'}}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={theme.accent} />
          </marker>
        </defs>
        {E.map((e, i) => {
          const a = boxes[e.from];
          const b = boxes[e.to];
          if (!a || !b) return null;
          const start = Math.max(a.appear, b.appear) - 0.25;
          const p = t(start, 0.6);
          if (p <= 0) return null;
          const A = anchor(a, center(b));
          const B = anchor(b, center(a));
          const x = A.x + (B.x - A.x) * p;
          const y = A.y + (B.y - A.y) * p;
          return (
            <g key={i}>
              <line
                x1={A.x}
                y1={A.y}
                x2={x}
                y2={y}
                stroke={theme.accent}
                strokeWidth={3}
                strokeDasharray={e.dashed ? '10 10' : undefined}
                markerEnd={p >= 1 && !e.noArrow ? 'url(#arrow)' : undefined}
                opacity={0.9}
              />
              {e.label && (
                <text
                  x={(A.x + B.x) / 2 + (direction === 'down' ? 24 : 0)}
                  y={(A.y + B.y) / 2 + (direction === 'down' ? 8 : -16)}
                  fill={theme.muted}
                  fontSize={24}
                  fontStyle="italic"
                  textAnchor={direction === 'down' ? 'start' : 'middle'}
                  fontFamily={theme.font}
                  paintOrder="stroke"
                  stroke={theme.canvas}
                  strokeWidth={8}
                  opacity={t(start + 0.5, 0.4)}
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => {
        const b = boxes[n.id];
        const a = t(b.appear, 0.55);
        const em = n.emphasis || (layout === 'hub' && n.id === (hub ?? nodes[0].id));
        const g = vertical ? Math.min(88, b.h * 0.42) : Math.min(64, b.h * 0.55);
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              boxSizing: 'border-box',
              borderRadius: 18,
              background: em ? theme.elevated : theme.panel,
              border: `2px ${n.dashed ? 'dashed' : 'solid'} ${em ? theme.accent : theme.border}`,
              display: 'flex',
              flexDirection: vertical ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: vertical ? 14 : 22,
              padding: vertical ? '10px 18px' : '0 24px',
              textAlign: vertical ? 'center' : 'left',
              opacity: a,
              transform: `scale(${0.9 + 0.1 * a})`,
            }}
          >
            {n.glyph && <Glyph name={n.glyph} size={g} />}
            <div style={{minWidth: 0}}>
              <div style={{fontSize: vertical ? 30 : 28, fontWeight: 700, lineHeight: 1.2}}>{n.label}</div>
              {n.sublabel && <div style={{fontSize: 22, color: theme.muted, marginTop: 6, lineHeight: 1.25}}>{n.sublabel}</div>}
            </div>
          </div>
        );
      })}
      {caption && (
        <div style={{position: 'absolute', right: theme.margin, bottom: 62, maxWidth: 1300, textAlign: 'right', fontSize: 30, opacity: t(2.5, 0.6)}}>
          {caption}
        </div>
      )}
    </Frame>
  );
};
