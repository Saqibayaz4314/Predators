import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AIExplanationData } from '@flood/shared';
import { AiBriefCard } from './AiBrief';

const noop = () => {};
const brief: AIExplanationData = {
  title: 'Bridge Corridor Flood — modeled disruption',
  summary: 'The simulated corridor closure lengthens the modeled shortest path and severs several shelter connections.',
  observations: ['Rerouting adds measurable distance.', 'Two candidates become unreachable.'],
  limitations: ['Simulated polygons, not forecasts.', 'No water-depth modeling.'],
  language: 'en', source: 'ai', classification: 'simulated',
};
const render = (view: Parameters<typeof AiBriefCard>[0]['view'], scenarioTitle = 'Bridge Corridor Flood') => renderToStaticMarkup(createElement(AiBriefCard, { view, scenarioTitle, onGenerate: noop, onRetry: noop }));

it('idle state explains the brief and requires an explicit generate action', () => {
  const markup = render({ state: 'idle' });
  expect(markup).toContain('Generate AI Decision Brief');
  expect(markup).toContain('No AI request is sent automatically');
  expect(markup).toContain('Bridge Corridor Flood');
  expect(markup).not.toContain(brief.title);
});

it('loading state tells the user the hosted model may take several seconds', () => {
  const markup = render({ state: 'loading' }, 'Baseline');
  expect(markup).toContain('Generating the decision brief');
  expect(markup).toContain('several seconds');
  expect(markup).toContain('aria-busy="true"');
});

it('success state labels hosted model output and renders every schema field', () => {
  const markup = render({ state: 'success', brief });
  expect(markup).toContain('Hosted model output (DigitalOcean inference)');
  expect(markup).toContain(brief.title);
  expect(markup).toContain(brief.summary);
  expect(markup).toContain('Rerouting adds measurable distance.');
  expect(markup).toContain('No water-depth modeling.');
  expect(markup).toContain('never overrides the deterministic routing metrics');
});

it('success state labels deterministic fallback as not model output', () => {
  const markup = render({ state: 'success', brief: { ...brief, source: 'deterministic_fallback' } });
  expect(markup).toContain('Deterministic fallback — not model output');
  expect(markup).not.toContain('Hosted model output');
});

it('error state shows rate-limit guidance and an explicit retry', () => {
  const markup = render({ state: 'error', message: 'Too many AI brief requests. Wait 42 seconds before generating another brief.' }, 'Baseline');
  expect(markup).toContain('Wait 42 seconds');
  expect(markup).toContain('Retry');
  expect(markup).toContain('unaffected');
});

it('error state keeps curated messages for timeouts and unreachable services', () => {
  const timeout = render({ state: 'error', message: 'The analysis request timed out. Retry in a moment.' }, 'Baseline');
  expect(timeout).toContain('timed out');
  const unreachable = render({ state: 'error', message: 'Could not reach the analysis service. Check the connection and retry.' }, 'Baseline');
  expect(unreachable).toContain('Could not reach the analysis service');
});
