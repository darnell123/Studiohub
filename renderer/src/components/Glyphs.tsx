import React from 'react';
import {theme} from '../theme';

// Simple 64×64 line icons, all drawn in one stroke style.
const P: Record<string, React.ReactNode> = {
  laptop: (<><rect x="12" y="12" width="40" height="27" rx="3" /><path d="M5 46h54l-4 6H9z" fill="currentColor" /></>),
  house: (<><path d="M8 30L32 10l24 20" /><path d="M15 26v28h34V26" /><rect x="24" y="36" width="16" height="18" rx="1" /></>),
  person: (<><circle cx="32" cy="22" r="10" /><path d="M12 56c2-12 10-18 20-18s18 6 20 18" /></>),
  people: (<><circle cx="24" cy="24" r="8" /><circle cx="43" cy="26" r="7" /><path d="M8 54c1-10 8-15 16-15s15 5 16 15" /><path d="M38 40c8-1 16 4 18 14" /></>),
  id: (<><rect x="6" y="14" width="52" height="36" rx="4" /><circle cx="22" cy="30" r="6" /><path d="M13 44c2-5 5-7 9-7s7 2 9 7" /><path d="M38 26h13M38 34h13M38 42h8" /></>),
  money: (<><rect x="6" y="18" width="52" height="30" rx="4" /><circle cx="32" cy="33" r="7" /><path d="M14 26v14M50 26v14" /></>),
  bank: (<><path d="M8 24L32 10l24 14z" /><path d="M14 28v18M26 28v18M38 28v18M50 28v18" /><path d="M8 52h48" /></>),
  building: (<><rect x="14" y="8" width="36" height="48" rx="2" /><path d="M22 18h6M36 18h6M22 28h6M36 28h6M22 38h6M36 38h6" /><path d="M28 56v-8h8v8" /></>),
  globe: (<><circle cx="32" cy="32" r="24" /><ellipse cx="32" cy="32" rx="10" ry="24" /><path d="M8 32h48M12 20h40M12 44h40" /></>),
  document: (<><path d="M16 6h22l12 12v40H16z" /><path d="M38 6v12h12" /><path d="M23 30h20M23 38h20M23 46h12" /></>),
  lock: (<><rect x="14" y="28" width="36" height="28" rx="4" /><path d="M22 28v-8a10 10 0 0120 0v8" /></>),
  check: (<><circle cx="32" cy="32" r="24" /><path d="M21 33l8 8 15-17" /></>),
  alert: (<><path d="M32 8l26 46H6z" /><path d="M32 26v14" /><circle cx="32" cy="47" r="1.5" fill="currentColor" /></>),
  cross: (<><circle cx="32" cy="32" r="24" /><path d="M23 23l18 18M41 23L23 41" /></>),
  chat: (<><path d="M8 12h48v30H26l-12 10V42H8z" /></>),
  shield: (<><path d="M32 6l22 8v16c0 14-10 23-22 28C20 53 10 44 10 30V14z" /><path d="M22 32l7 7 13-14" /></>),
  video: (<><rect x="6" y="16" width="38" height="32" rx="4" /><path d="M44 28l14-8v24l-14-8z" /></>),
  fingerprint: (<><path d="M18 46c-3-6-4-12-2-18a16 16 0 0131 0" /><path d="M24 52c-3-6-4-14-2-20a10 10 0 0119 0c1 6 0 12-2 18" /><path d="M32 54c-2-7-3-14-2-20" /><path d="M47 34c1 6 0 12-2 18" /></>),
  box: (<><path d="M8 20l24-12 24 12v26L32 58 8 46z" /><path d="M8 20l24 12 24-12M32 32v26" /></>),
  website: (<><rect x="6" y="10" width="52" height="44" rx="4" /><path d="M6 20h52" /><circle cx="12" cy="15" r="1.5" fill="currentColor" /><circle cx="18" cy="15" r="1.5" fill="currentColor" /><path d="M14 30h20M14 38h36M14 46h28" /></>),
  phone: (<><rect x="18" y="4" width="28" height="56" rx="5" /><path d="M28 52h8" /></>),
  crypto: (<><circle cx="32" cy="32" r="24" /><path d="M26 18v28M32 18v4M32 42v4M26 22h10a5 5 0 010 10H26h11a5 5 0 010 10H26" /></>),
  mask: (<><path d="M8 22c8-6 40-6 48 0-1 14-8 22-16 22-4 0-6-4-8-4s-4 4-8 4c-8 0-15-8-16-22z" /><ellipse cx="22" cy="29" rx="5" ry="3" /><ellipse cx="42" cy="29" rx="5" ry="3" /></>),
  keyboard: (<><rect x="4" y="18" width="56" height="30" rx="4" /><path d="M12 27h4M22 27h4M32 27h4M42 27h4M12 35h4M22 35h4M32 35h4M42 35h8M18 42h28" /></>),
  flag: (<><path d="M14 58V8" /><path d="M14 10h34l-6 10 6 10H14" /></>),
  file: (<><path d="M16 6h22l12 12v40H16z" /><path d="M38 6v12h12" /><path d="M26 34l6 6 8-10" /></>),
  link: (<><path d="M27 37a9 9 0 0013 0l8-8a9 9 0 00-13-13l-3 3" /><path d="M37 27a9 9 0 00-13 0l-8 8a9 9 0 0013 13l3-3" /></>),
};

export type GlyphName = keyof typeof P;
export const glyphNames = Object.keys(P);

export const Glyph: React.FC<{name: string; size: number; color?: string; strokeWidth?: number}> = ({name, size, color = theme.accent, strokeWidth = 3.5}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{color}}>
    {P[name] ?? P.document}
  </svg>
);

export const Laptop: React.FC<{size: number; color?: string}> = (p) => <Glyph name="laptop" {...p} />;
export const House: React.FC<{size: number; color?: string}> = (p) => <Glyph name="house" {...p} />;
