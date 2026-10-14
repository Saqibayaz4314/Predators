import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mainRoutes, resolveRoute } from './navigation';
import { ClosureChart } from './ClosureChart';
import { buildReport } from './report-content';
it('resolves five deep links, trailing slashes and unknown addresses',()=>{expect(mainRoutes).toHaveLength(5);expect(resolveRoute('/')?.title).toContain('ATLAS');expect(resolveRoute('/overview')?.title).toBe('Overview');for(const route of mainRoutes)expect(resolveRoute(route.path)).toEqual(route);expect(resolveRoute('/analysis/')).toEqual(resolveRoute('/analysis'));expect(resolveRoute('/unknown')).toBeNull();});
it('does not invent route findings or AI content when inputs are unavailable',()=>{const report=buildReport({areaName:'Sukkur',datasetVersion:'test',scenarioTitle:'Baseline'});expect(report).toContain('Not evaluated');expect(report).toContain('Pending verified backend integration');expect(report).toContain('not observed events or predictions');expect(report).not.toContain('4.42');});
it('renders closure chart labels directly from provided API values',()=>{const markup=renderToStaticMarkup(createElement(ClosureChart,{items:[{scenarioId:'a',title:'Scenario A',affectedPhysicalSegments:12},{scenarioId:'b',title:'Scenario B',affectedPhysicalSegments:24}]}));expect(markup).toContain('50%');expect(markup).toContain('100%');expect(markup).toContain('>12<');expect(markup).toContain('>24<');});
