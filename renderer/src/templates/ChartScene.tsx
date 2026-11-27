import React from 'react';
import {Frame, useAnim} from '../components/Frame';
import {theme} from '../theme';
import type {ChartParams} from '../types';

export const ChartScene: React.FC<ChartParams> = (p) => {
  const {t} = useAnim();

  if (p.kind === 'split') {
    const grow = t(0.9, 1.4);
    const labels = t(2.1, 0.6);
    const w = 1680;
    const portionW = (w * p.portion) / 100;
    return (
      <Frame title={p.title} tag={p.tag} source={p.source}>
        <div style={{position: 'absolute', left: theme.margin, top: 420, width: w}}>
          <div style={{fontSize: 30, color: theme.muted, marginBottom: 22, opacity: t(0.5, 0.5)}}>{p.barLabel}</div>
          <div
            style={{
              position: 'relative',
              height: 150,
              borderRadius: 10,
              background: theme.elevated,
              border: `2px solid ${theme.border}`,
              overflow: 'hidden',
              opacity: t(0.5, 0.5),
            }}
          >
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: portionW * grow, background: theme.accent}} />
            {p.rangeFrom !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  left: (w * p.rangeFrom) / 100,
                  top: 0,
                  bottom: 0,
                  width: ((w * (p.portion - p.rangeFrom)) / 100) * labels,
                  background: `repeating-linear-gradient(135deg, ${theme.text} 0 10px, ${theme.accent} 10px 20px)`,
                  opacity: 0.85,
                }}
              />
            )}
          </div>
          <div style={{position: 'relative', height: 160, marginTop: 28, opacity: labels}}>
            <div style={{position: 'absolute', left: 0, width: portionW - 40}}>
              <div style={{fontSize: 96, fontWeight: 800, color: theme.accent, lineHeight: 1}}>{p.portionDisplay}</div>
              <div style={{fontSize: 30, marginTop: 10}}>{p.portionLabel}</div>
            </div>
            <div style={{position: 'absolute', left: portionW + 20, width: w - portionW - 20}}>
              <div style={{fontSize: 30, color: theme.muted, marginTop: 14}}>{p.restLabel}</div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  const max = Math.max(...p.bars.map((b) => b.value));
  const plotTop = 330;
  const plotH = 520;
  const barW = Math.min(360, 1200 / p.bars.length);
  const gap = barW * 0.7;
  const totalW = p.bars.length * barW + (p.bars.length - 1) * gap;
  const left = (theme.width - totalW) / 2;
  const baseY = plotTop + plotH;

  return (
    <Frame title={p.title} tag={p.tag} source={p.source}>
      <div style={{position: 'absolute', left: theme.margin, right: theme.margin, top: baseY, height: 3, background: theme.border, opacity: t(0.3, 0.5)}} />
      {p.bars.map((b, i) => {
        const g = t(0.8 + i * 0.5, 1.2);
        const h = Math.max(6, (b.value / max) * plotH) * g;
        const lbl = t(1.6 + i * 0.5, 0.5);
        const x = left + i * (barW + gap);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: baseY - h,
                width: barW,
                height: h,
                background: i === p.bars.length - 1 ? theme.accent : 'rgba(223,179,113,0.55)',
                borderRadius: '8px 8px 0 0',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: x - 100,
                width: barW + 200,
                top: baseY - h - 90,
                textAlign: 'center',
                fontSize: 64,
                fontWeight: 800,
                opacity: lbl,
                color: theme.text,
              }}
            >
              {b.display}
            </div>
            <div style={{position: 'absolute', left: x - 60, width: barW + 120, top: baseY + 22, textAlign: 'center', opacity: t(0.6 + i * 0.5, 0.5)}}>
              <div style={{fontSize: 34, fontWeight: 600}}>{b.label}</div>
              {b.sublabel && <div style={{fontSize: 26, color: theme.muted, marginTop: 6}}>{b.sublabel}</div>}
            </div>
          </React.Fragment>
        );
      })}
    </Frame>
  );
};
