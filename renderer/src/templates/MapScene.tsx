import React, {useMemo} from 'react';
import {geoNaturalEarth1, geoMercator, geoPath, geoGraticule10} from 'd3-geo';
import {feature} from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import world from 'world-atlas/countries-50m.json';
import usAtlas from 'us-atlas/states-10m.json';
import {Frame, useAnim} from '../components/Frame';
import {theme} from '../theme';
import type {MapParams} from '../types';

type Country = GeoJSON.Feature<GeoJSON.Geometry, {name: string}>;
const topo = world as unknown as Topology<{countries: GeometryCollection<{name: string}>}>;
const countries = (feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, {name: string}>)
  .features as Country[];
const usTopo = usAtlas as unknown as Topology<{states: GeometryCollection<{name: string}>}>;
const states = (feature(usTopo, usTopo.objects.states) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, {name: string}>)
  .features as Country[];

const W = theme.width;
const H = theme.height;

export const MapScene: React.FC<MapParams> = ({title, tag, rotate = 10, zoom, highlight = [], highlightStates, points = [], lines = [], caption, source}) => {
  const {t, sec} = useAnim();

  const projection = useMemo(() => {
    if (zoom) {
      return geoMercator().center(zoom.center).scale(zoom.scale).translate([W / 2, H / 2 + 40]);
    }
    return geoNaturalEarth1()
      .rotate([-rotate, 0])
      .fitExtent(
        [
          [80, 200],
          [W - 80, H - 110],
        ],
        {type: 'Sphere'},
      );
  }, [zoom, rotate]);
  const path = geoPath(projection);

  const byId = Object.fromEntries(points.map((p) => [p.id, p]));
  const xy = (id: string) => projection([byId[id].lon, byId[id].lat]) as [number, number];

  // timing (seconds)
  const mapIn = t(0, 0.9);
  const hlStart = 0.6;
  const ptStart = hlStart + (highlight.length + (highlightStates?.length ?? 0)) * 0.25 + 0.2;
  const lineStart = ptStart + points.length * 0.2 + 0.2;
  const lineLen = 0.9;

  // gentle push-in over the whole clip
  const push = 1 + Math.min(sec, 8) * 0.006;

  return (
    <Frame title={title} tag={tag} source={source}>
      <svg
        width={W}
        height={H}
        style={{position: 'absolute', opacity: mapIn, transform: `scale(${push})`, transformOrigin: '50% 55%'}}
      >
        <path d={path(geoGraticule10()) ?? ''} stroke={theme.border} strokeWidth={1} fill="none" opacity={0.35} />
        {countries.map((c, i) => {
          const idx = highlight.indexOf(c.properties.name);
          const h = idx >= 0 ? t(hlStart + idx * 0.25, 0.6) : 0;
          return (
            <path
              key={i}
              d={path(c) ?? ''}
              fill={idx >= 0 ? `rgba(223,179,113,${0.12 + 0.5 * h})` : theme.land}
              stroke={idx >= 0 && h > 0 ? theme.accent : theme.landStroke}
              strokeWidth={idx >= 0 ? 1.4 : 0.7}
            />
          );
        })}

        {highlightStates &&
          states.map((st, i) => {
            const idx = highlightStates.indexOf(st.properties.name);
            const h = idx >= 0 ? t(hlStart + idx * 0.25, 0.6) : 0;
            return (
              <path
                key={`s${i}`}
                d={path(st) ?? ''}
                fill={idx >= 0 ? `rgba(223,179,113,${0.12 + 0.5 * h})` : 'none'}
                stroke={idx >= 0 && h > 0 ? theme.accent : theme.landStroke}
                strokeWidth={idx >= 0 ? 2 : 1}
              />
            );
          })}
        {lines.map((l, i) => {
          const [x1, y1] = xy(l.from);
          const [x2, y2] = xy(l.to);
          const p = t(lineStart + i * 0.35, lineLen);
          // screen-space arc bowed upward
          const mx = (x1 + x2) / 2;
          const bow = l.bow ?? 0.28;
          const my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * bow;
          const N = 60;
          const pts: string[] = [];
          for (let k = 0; k <= Math.round(N * p); k++) {
            const s = k / N;
            const x = (1 - s) ** 2 * x1 + 2 * (1 - s) * s * mx + s ** 2 * x2;
            const y = (1 - s) ** 2 * y1 + 2 * (1 - s) * s * my + s ** 2 * y2;
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
          }
          const head = pts[pts.length - 1]?.split(',').map(Number);
          return (
            <g key={i}>
              {pts.length > 1 && (
                <polyline
                  points={pts.join(' ')}
                  fill="none"
                  stroke={theme.accent}
                  strokeWidth={3}
                  strokeDasharray={l.dashed ? '10 10' : undefined}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              )}
              {head && p > 0 && p < 1 && <circle cx={head[0]} cy={head[1]} r={6} fill={theme.text} />}
              {l.label && p >= 1 && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * bow * 0.5 + (bow < 0 ? 40 : -14)}
                  fill={theme.muted}
                  fontSize={24}
                  fontStyle="italic"
                  textAnchor="middle"
                  fontFamily={theme.font}
                  opacity={t(lineStart + i * 0.35 + lineLen, 0.4)}
                >
                  {l.label}
                </text>
              )}
            </g>
          );
        })}

        {points.map((pt, i) => {
          const [x, y] = xy(pt.id);
          const p = t(ptStart + i * 0.2, 0.5);
          const pulse = (sec * 0.8 + i * 0.3) % 1;
          const region = pt.kind === 'region';
          const target = pt.kind === 'target';
          const dir = pt.labelDir ?? (y < 330 ? 'below' : 'above');
          const off = region ? 84 : 30;
          const lx = dir === 'left' ? x - off : dir === 'right' ? x + off : x;
          const ly = dir === 'below' ? y + off + 22 : dir === 'above' ? y - off - (pt.note ? 34 : 0) : y + 4;
          const anchor = dir === 'left' ? 'end' : dir === 'right' ? 'start' : 'middle';
          return (
            <g key={pt.id} opacity={p}>
              {region ? (
                <circle cx={x} cy={y} r={70 * p} fill={theme.accentSoft} stroke={theme.accent} strokeWidth={2} strokeDasharray="6 8" />
              ) : (
                <>
                  <circle cx={x} cy={y} r={14 + pulse * 26} fill="none" stroke={theme.accent} strokeWidth={2} opacity={1 - pulse} />
                  <circle cx={x} cy={y} r={(target ? 13 : 10) * p} fill={target ? theme.text : theme.accent} stroke={theme.canvas} strokeWidth={3} />
                </>
              )}
              <text
                x={lx}
                y={ly}
                fill={theme.text}
                fontSize={30}
                fontWeight={700}
                textAnchor={anchor}
                fontFamily={theme.font}
                paintOrder="stroke"
                stroke={theme.canvas}
                strokeWidth={8}
              >
                {pt.label}
              </text>
              {pt.note && (
                <text
                  x={lx}
                  y={ly + 34}
                  fill={theme.muted}
                  fontSize={23}
                  textAnchor={anchor}
                  fontFamily={theme.font}
                  paintOrder="stroke"
                  stroke={theme.canvas}
                  strokeWidth={8}
                >
                  {pt.note}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {caption && (
        <div
          style={{
            position: 'absolute',
            right: theme.margin,
            bottom: 62,
            maxWidth: 1300,
            textAlign: 'right',
            fontSize: 30,
            color: theme.text,
            opacity: t(lineStart + lines.length * 0.35 + 0.6, 0.6),
          }}
        >
          {caption}
        </div>
      )}
    </Frame>
  );
};
