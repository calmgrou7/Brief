import { layers, type Scene } from '../scene.ts';
export function yeongdo(svg: SVGSVGElement, filter: string): Scene {
  const L = layers(svg, filter);
  return { root: L.root, dur: 5, tau: [0.7, 0.72], title: { han: '', name: 'yeongdo' }, caps: [], update() {} };
}
