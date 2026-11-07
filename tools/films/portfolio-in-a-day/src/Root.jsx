import React from 'react';
import { Composition } from 'remotion';
import WORDS from './words.json';
import { timing, FPS } from './timeline.jsx';
import { Film } from './Film.jsx';

const frames = Math.ceil(timing(WORDS).TOTAL * FPS);
export const Root = () => (
  <>
    <Composition id="Film-h" component={Film} durationInFrames={frames} fps={FPS} width={1920} height={1080} defaultProps={{ L: 'h' }} />
    <Composition id="Film-v" component={Film} durationInFrames={frames} fps={FPS} width={1080} height={1920} defaultProps={{ L: 'v' }} />
  </>
);
