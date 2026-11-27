// Matches TRACE/DesignSystem/TraceStyle.swift
import {loadFont} from '@remotion/google-fonts/Inter';

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']});

export const theme = {
  font: fontFamily,
  canvas: '#131312',
  panel: '#1b1b18',
  elevated: '#24221d',
  border: '#322f29',
  text: '#f1ece0',
  muted: '#aba496',
  dim: '#6b665c',
  accent: '#dfb371',
  accentSoft: 'rgba(223,179,113,0.18)',
  land: '#2a2823',
  landStroke: '#3a362e',
  margin: 120,
  width: 1920,
  height: 1080,
  fps: 30,
};
