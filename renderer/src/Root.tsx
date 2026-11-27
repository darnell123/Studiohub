import React from 'react';
import {Composition} from 'remotion';
import {Cue} from './Cue';
import {theme} from './theme';
import type {CueProps} from './types';
import {RoughCut} from './RoughCut';
import {films} from './films.generated';

const defaultProps: CueProps = {
  template: 'text',
  durationSec: 5,
  params: {lines: ['Studio renderer'], style: 'title', mode: 'stack'},
};

export const Root: React.FC = () => (
  <>
  <Composition
    id="Cue"
    component={Cue as unknown as React.FC<Record<string, unknown>>}
    width={theme.width}
    height={theme.height}
    fps={theme.fps}
    durationInFrames={150}
    defaultProps={defaultProps as unknown as Record<string, unknown>}
    calculateMetadata={({props}) => ({
      durationInFrames: Math.round(((props as unknown as CueProps).durationSec ?? 5) * theme.fps),
    })}
  />
  {Object.entries(films).map(([slug, timeline]) => (
    <Composition
      key={slug}
      id={`RoughCut-${slug}`}
      component={RoughCut as unknown as React.FC<Record<string, unknown>>}
      width={theme.width}
      height={theme.height}
      fps={theme.fps}
      durationInFrames={Math.round(timeline.durationSec * theme.fps)}
      defaultProps={{timeline, clean: false} as unknown as Record<string, unknown>}
    />
  ))}
  </>
);
