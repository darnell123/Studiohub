import React from 'react';
import type {CueProps} from './types';
import {MapScene} from './templates/MapScene';
import {ChartScene} from './templates/ChartScene';
import {CounterScene} from './templates/CounterScene';
import {TimelineScene} from './templates/TimelineScene';
import {TextCard} from './templates/TextCard';
import {FlowScene} from './templates/FlowScene';

export const Cue: React.FC<CueProps> = (props) => {
  switch (props.template) {
    case 'map':
      return <MapScene {...props.params} />;
    case 'chart':
      return <ChartScene {...props.params} />;
    case 'counter':
      return <CounterScene {...props.params} />;
    case 'timeline':
      return <TimelineScene {...props.params} />;
    case 'flow':
      return <FlowScene {...props.params} />;
    case 'text':
      return <TextCard {...props.params} />;
  }
};
