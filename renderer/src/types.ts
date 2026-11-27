export type Source = {whatToShow: string; playsUnder: string};

export type MapPoint = {id: string; label: string; lon: number; lat: number; kind?: 'point' | 'region' | 'target'; note?: string; labelDir?: 'above' | 'below' | 'left' | 'right'};
export type MapParams = {
  title?: string;
  tag?: string;
  rotate?: number; // central longitude
  zoom?: {center: [number, number]; scale: number};
  highlight?: string[]; // country names from world-atlas
  points?: MapPoint[];
  highlightStates?: string[]; // U.S. state names; draws the U.S. states layer
  lines?: {from: string; to: string; dashed?: boolean; label?: string; bow?: number}[];
  caption?: string;
  source?: string;
};

export type ChartParams =
  | {
      kind: 'bars';
      title?: string;
      bars: {label: string; value: number; display: string; sublabel?: string}[];
      source?: string;
      tag?: string;
    }
  | {
      kind: 'split';
      title?: string;
      barLabel: string;
      portion: number; // percent
      rangeFrom?: number; // percent: shows portion as a range (rangeFrom–portion)
      portionLabel: string;
      portionDisplay: string;
      restLabel: string;
      source?: string;
      tag?: string;
    };

export type Stat = {prefix?: string; value?: number; text?: string; decimals?: number; suffix?: string; qualifier?: string; label: string};
export type CounterParams = {
  title?: string;
  stats: Stat[];
  icons?: {count: number; glyph: string; label?: string; qualifier?: string};
  source?: string;
  tag?: string;
};

export type TimelineParams = {
  title?: string;
  tag?: string;
  from?: string; // YYYY-MM; defaults to the earliest date shown
  to?: string;
  spans?: {from: string; to?: string; label: string}[]; // no `to` = ongoing
  markers?: {date: string; label: string}[];
  source?: string;
};

export type TextParams = {
  kicker?: string;
  lines: string[];
  style: 'question' | 'quote' | 'title' | 'list';
  mode: 'sequence' | 'stack';
  attribution?: string;
  finale?: 'blank-prompt';
};

export type FlowNode = {id: string; label: string; sublabel?: string; glyph?: string; col?: number; dashed?: boolean; emphasis?: boolean};
export type FlowParams = {
  title?: string;
  tag?: string;
  source?: string;
  caption?: string;
  layout?: 'columns' | 'hub';
  direction?: 'right' | 'down';
  hub?: string;
  nodes: FlowNode[];
  edges?: {from: string; to: string; label?: string; dashed?: boolean; noArrow?: boolean}[];
};

export type CueSpec =
  | {template: 'flow'; params: FlowParams}
  | {template: 'map'; params: MapParams}
  | {template: 'chart'; params: ChartParams}
  | {template: 'counter'; params: CounterParams}
  | {template: 'timeline'; params: TimelineParams}
  | {template: 'text'; params: TextParams};

export type CueProps = CueSpec & {durationSec: number};
