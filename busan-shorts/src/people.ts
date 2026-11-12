// People of Busan, drawn in figure space (feet on y = 120, facing +x, standing at x = 40).
// New characters for this project: a tourist with a backpack, a Jagalchi fish-market
// ajumma (permed hair, apron, red rubber gloves), a running kid, a woman in a coat.
// Legs are solved with gait() even when hidden; clothes are drawn around them.
import { el, limb, solid, blot, shoe, place, f, PAPER, PEN, type Vec, type Limb } from '../lib/ink.ts';
import { gait, type Gait } from '../lib/gait.ts';
import { spring, pendulum } from '../lib/motion.ts';
import { nightTint, type Palette } from '../lib/daynight.ts';
import { ease, clamp, lerp, C, mrnd } from './kit.ts';

export type Kind = 'tourist' | 'ajumma' | 'kid' | 'coat';

export interface PersonOpts {
  shirt?: string; pants?: string; extra?: string;
  /** stop at this scene x and do an action, then walk on */
  stopAt?: number; action?: 'photo' | 'wave' | 'call';
  actionFor?: number;
  /** stand still (stall keeper) doing `action` on a loop */
  stand?: boolean;
  speedMul?: number;
}

const L = (g: Element, d = '') => { const n = el('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': PEN, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); return n; };

export class Person {
  g: SVGGElement;
  x: number; y: number; dir: 1 | -1; scale: number; kind: Kind; o: PersonOpts;
  done = false;
  private walk: Gait;
  private phase = mrnd(0, 1);
  private go = 1;
  private actT = -1;
  private acted = false;
  private legs: Limb[]; private shoes: SVGPathElement[];
  private farArm: Limb; private nearArm: Limb;
  private torso: SVGPathElement; private seam: SVGPathElement; private apron?: SVGPathElement; private pack?: SVGPathElement; private strap?: SVGPathElement;
  private head: SVGEllipseElement; private hair: SVGPathElement; private hat?: SVGPathElement;
  private gloves: SVGPathElement[] = []; private phone?: SVGPathElement;
  private arm = [spring(60, 9), spring(60, 9)];
  private bag = pendulum(12, 1.6);
  phoneAt: Vec | null = null;

  constructor(parent: Element, kind: Kind, x: number, y: number, dir: 1 | -1, scale: number, o: PersonOpts = {}) {
    this.kind = kind; this.x = x; this.y = y; this.dir = dir; this.scale = scale; this.o = o;
    this.walk = gait(kind === 'kid' ? { kind: 'run' } : kind === 'ajumma' ? { kind: 'walk', period: 1.1, stride: 20 } : { kind: 'walk' });
    const g = this.g = el('g', {}, parent);
    const kid = kind === 'kid';
    if (kind === 'tourist') this.pack = C(g, '', o.extra ?? '#3d6b8c');
    this.farArm = limb(g, kid ? 3 : 3.6);
    const legW = kid ? 3.4 : 4.2;
    this.legs = [limb(g, legW), limb(g, legW)];
    const pants = o.pants ?? (kind === 'ajumma' ? '#6f5a86' : kind === 'kid' ? '#2f4f7a' : kind === 'coat' ? '#2a2a2a' : '#34507a');
    this.legs.forEach((l) => { solid(l, pants); l.g.dataset.solid = pants; });
    this.shoes = [blot(g), blot(g)];
    const shirt = o.shirt ?? ({ tourist: '#e9e4d6', ajumma: '#d77a93', kid: '#f2c94c', coat: '#b98a5a' } as const)[kind];
    this.torso = C(g, '', shirt);
    this.seam = L(g); this.seam.setAttribute('stroke-width', PEN * 0.6);
    if (kind === 'ajumma') this.apron = C(g, '', o.extra ?? '#2d4a6e');
    if (kind === 'tourist') { this.strap = L(g); this.strap.setAttribute('stroke-width', PEN * 0.8); }
    this.head = el('ellipse', { rx: kid ? 5.2 : 3.7, ry: kid ? 6 : 4.6, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN }, g);
    this.hair = blot(g);
    if (kind === 'tourist' || kind === 'kid') { this.hat = C(g, '', kind === 'kid' ? '#d9534f' : '#c44d3a', PEN * 0.8); }
    this.nearArm = limb(g, kid ? 3 : 3.6);
    if (kind === 'ajumma') this.gloves = [C(g, '', '#d23b2f', PEN * 0.6), C(g, '', '#d23b2f', PEN * 0.6)];
    if (o.action === 'photo') this.phone = C(g, '', '#222831', PEN * 0.5);
    if (o.stand) { this.go = 0; }
  }

  get speed() { return this.walk.speed * this.scale * (this.o.speedMul ?? 1); }

  draw(t: number, dt: number, Pl: Palette, wind = 0) {
    const o = this.o, kid = this.kind === 'kid';
    // --- behaviour: walk, stop for an action, walk on
    let act = 0;
    if (o.stand) {
      act = 1; this.go = 0;
    } else {
      if (!this.acted && o.stopAt !== undefined && (this.x - o.stopAt) * this.dir >= 0) { this.acted = true; this.actT = 0; }
      if (this.actT >= 0) {
        this.actT += dt;
        const D = o.actionFor ?? 3;
        this.go = 1 - (this.actT < 0.45 ? ease(this.actT / 0.45) : this.actT < D ? 1 : 1 - ease((this.actT - D) / 0.45));
        act = this.actT < 0.45 ? 0 : this.actT < 0.85 ? ease((this.actT - 0.45) / 0.4) : this.actT < D - 0.4 ? 1 : this.actT < D ? 1 - ease((this.actT - D + 0.4) / 0.4) : 0;
        if (this.actT > D + 0.45) { this.actT = -1; this.go = 1; }
      }
      this.phase += (dt / this.walk.period) * this.go;
      this.x += this.dir * this.speed * dt * this.go;
    }
    place(this.g, this.x, this.y, this.dir, this.scale);

    const p = this.walk.pose(this.phase, this.go);
    const b = p.bob;
    p.feet.forEach((fo, i) => { this.legs[i].draw([p.hip, fo.knee, fo.ankle], [0.3, 0.8]); shoe(this.shoes[i], fo.ankle, fo.pitch); });
    this.g.insertBefore(this.legs[p.front].g, this.torso); this.g.insertBefore(this.shoes[p.front], this.torso);
    // night tint for solid legs
    this.legs.forEach((l) => l.g.querySelector('path')!.setAttribute('fill', nightTint(l.g.dataset.solid!, Pl)));
    this.g.querySelectorAll<SVGPathElement>('[data-base]').forEach((n) => n.setAttribute('fill', nightTint(n.dataset.base!, Pl)));

    const hipY = p.hip[1];
    const torsoLen = kid ? 19 : this.kind === 'ajumma' ? 30 : 32;
    const lean = kid ? 2.5 : 0;
    const sh: Vec = [41 + lean, hipY - torsoLen];
    const kF = p.feet[p.front].knee, aF = p.feet[p.front].ankle, aR = p.feet[1 - p.front].ankle;
    const wide = this.kind === 'ajumma' ? 2 : 0;

    // torso / garment
    if (this.kind === 'coat') {
      const fx = Math.max(kF[0] + 2.4, 46.4), hem = 96;
      this.torso.setAttribute('d', `M${f(sh[0] - 6)} ${f(sh[1] + 1)} Q${f(sh[0])} ${f(sh[1] - 2.4)} ${f(sh[0] + 5)} ${f(sh[1] + 1)} L${f(fx - 0.6)} ${f(hipY - 4)} Q${f(fx)} ${f(hipY + 8)} ${f(Math.max(fx, aF[0] - 4))} ${hem} L${f(Math.min(31, aR[0] + 3))} ${hem + 1} L${f(33)} ${f(hipY - 4)}Z`);
      this.seam.setAttribute('d', `M${f(sh[0] + 2.6)} ${f(sh[1] + 4)} L${f(sh[0] + 3.8)} ${f(hem - 2)}`);
    } else {
      const sw = kid ? 5.2 : 6.6 + wide, ww = kid ? 5 : 7 + wide;
      this.torso.setAttribute('d', `M${f(sh[0] - sw)} ${f(sh[1] + 1.4)} Q${f(sh[0])} ${f(sh[1] - 2.2)} ${f(sh[0] + sw - 1)} ${f(sh[1] + 1.4)} Q${f(sh[0] + sw + 0.6)} ${f(hipY - torsoLen * 0.4)} ${f(40 + ww)} ${f(hipY + 2)} Q${f(40)} ${f(hipY + 3.6)} ${f(40 - ww - 0.5)} ${f(hipY + 2)} Q${f(sh[0] - sw - 0.8)} ${f(hipY - torsoLen * 0.4)} ${f(sh[0] - sw)} ${f(sh[1] + 1.4)}Z`);
      this.seam.setAttribute('d', `M${f(40 - ww + 0.6)} ${f(hipY - 0.6)} Q40 ${f(hipY + 0.8)} ${f(40 + ww - 0.6)} ${f(hipY - 0.6)}`);
    }
    if (this.apron) {
      const fx = Math.max(kF[0] + 1.8, 47);
      this.apron.setAttribute('d', `M${f(sh[0] + 1)} ${f(sh[1] + 6)} L${f(sh[0] + 7.6)} ${f(sh[1] + 7)} Q${f(48.5)} ${f(hipY - 6)} ${f(fx)} ${f(hipY + 6)} L${f(fx + 0.8)} ${f(hipY + 18)} L${f(37)} ${f(hipY + 19)} Q${f(38)} ${f(hipY - 4)} ${f(sh[0] + 1)} ${f(sh[1] + 6)}Z`);
    }
    if (this.pack) {
      const bx = sh[0] - 7.6, by = sh[1] + 2;
      this.pack.setAttribute('d', `M${f(bx + 1)} ${f(by)} Q${f(bx - 6)} ${f(by)} ${f(bx - 6.5)} ${f(by + 8)} L${f(bx - 6)} ${f(by + 19)} Q${f(bx - 2)} ${f(by + 21)} ${f(bx + 1.2)} ${f(by + 19)}Z`);
      this.strap!.setAttribute('d', `M${f(sh[0] - 4)} ${f(sh[1] + 0.5)} Q${f(sh[0] + 1.5)} ${f(sh[1] + 9)} ${f(sh[0] - 2)} ${f(sh[1] + 18)}`);
    }

    // head + hair / hat
    const hc: Vec = [sh[0] + 1.6 + (kid ? 0.8 : 0), sh[1] - (kid ? 8.8 : 9.6)];
    this.head.setAttribute('cx', f(hc[0])); this.head.setAttribute('cy', f(hc[1]));
    const hr = kid ? 5.2 : 3.7, hv = kid ? 6 : 4.6;
    if (this.kind === 'ajumma') {
      // short perm: a cluster of curls sitting on the head
      const curls: string[] = [];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.05 + i * 0.16), cx = hc[0] + Math.cos(a) * hr * 0.95, cy = hc[1] - 1 + Math.sin(a) * hv * 0.95;
        curls.push(`M${f(cx - 1.9)} ${f(cy)} a1.9 1.9 0 1 0 3.8 0 a1.9 1.9 0 1 0 -3.8 0Z`);
      }
      this.hair.setAttribute('d', curls.join(' '));
    } else if (this.kind === 'coat') {
      // long hair falling behind
      this.hair.setAttribute('d', `M${f(hc[0] + 3.4)} ${f(hc[1] - 2)} Q${f(hc[0])} ${f(hc[1] - 6.6)} ${f(hc[0] - 4)} ${f(hc[1] - 2)} Q${f(hc[0] - 5.4)} ${f(hc[1] + 6)} ${f(hc[0] - 3)} ${f(hc[1] + 10.5)} L${f(hc[0] - 1.2)} ${f(hc[1] + 4)} Q${f(hc[0] + 1)} ${f(hc[1] - 3)} ${f(hc[0] + 3.4)} ${f(hc[1] - 2)}Z`);
    } else {
      this.hair.setAttribute('d', `M${f(hc[0] - hr)} ${f(hc[1])} Q${f(hc[0] - hr)} ${f(hc[1] - hv)} ${f(hc[0])} ${f(hc[1] - hv)} L${f(hc[0] - 1)} ${f(hc[1] - 1)}Z`);
    }
    if (this.hat) {
      const y0 = hc[1] - hv * 0.35;
      this.hat.setAttribute('d', `M${f(hc[0] - hr - 0.4)} ${f(y0)} Q${f(hc[0] - hr)} ${f(hc[1] - hv - 1.4)} ${f(hc[0] + 0.4)} ${f(hc[1] - hv - 1.2)} Q${f(hc[0] + hr + 0.6)} ${f(hc[1] - hv)} ${f(hc[0] + hr)} ${f(y0)} L${f(hc[0] + hr + 4)} ${f(y0 + 0.4)} Q${f(hc[0] + hr + 3.6)} ${f(y0 + 1.6)} ${f(hc[0] + hr - 0.4)} ${f(y0 + 1.2)} L${f(hc[0] - hr - 0.4)} ${f(y0)}Z`);
    }

    // arms: swing opposite the legs, through springs; actions blend in
    const up = kid ? 10 : 17, lo = kid ? 9.5 : 16;
    const legSwing = (p.feet[0].ankle[0] - 40) / (this.walk.stride / 2);
    const swingAmt = kid ? 34 : 16;
    const farA = this.arm[0].step(-legSwing * swingAmt * this.go + (kid ? 20 : 0), dt) * Math.PI / 180;
    const nearA = this.arm[1].step(legSwing * swingAmt * 0.9 * this.go - (kid ? 10 : 0), dt) * Math.PI / 180;
    const shF: Vec = [sh[0] - 1, sh[1] + 2], shN: Vec = [sh[0] + 1.6, sh[1] + 2.4];
    const armAt = (s: Vec, a: number, bend: number): [Vec, Vec] => {
      const e: Vec = [s[0] + up * Math.sin(a), s[1] + up * Math.cos(a)];
      return [e, [e[0] + lo * Math.sin(a + bend), e[1] + lo * Math.cos(a + bend)]];
    };
    let [eF, hF] = armAt(shF, farA, kid ? 0.9 : 0.25);
    let [eN, hN] = armAt(shN, nearA, kid ? 0.9 : 0.1);
    const action = o.action;
    if (act > 0.001 && action === 'photo') {
      // both hands lift a phone in front of the face
      const ph: Vec = [hc[0] + 10, hc[1] + 2];
      hN = lerpV(hN, ph, act); eN = lerpV(eN, [shN[0] + 7, shN[1] + 9], act);
      hF = lerpV(hF, [ph[0] - 0.6, ph[1] + 1.4], act); eF = lerpV(eF, [shF[0] + 6, shF[1] + 11], act);
      this.phone!.setAttribute('d', `M${f(ph[0] - 1)} ${f(ph[1] - 4.4)} L${f(ph[0] + 1.4)} ${f(ph[1] - 4.6)} L${f(ph[0] + 1.6)} ${f(ph[1] + 3.8)} L${f(ph[0] - 0.8)} ${f(ph[1] + 4)}Z`);
      this.phone!.setAttribute('opacity', f(act));
      this.phoneAt = act > 0.6 ? ph : null;
    } else if (this.phone) { this.phone.setAttribute('opacity', 0); this.phoneAt = null; }
    if (act > 0.001 && (action === 'wave' || action === 'call')) {
      // near hand goes up beside the head; the wrist waves (call = cupped at the mouth, bobbing)
      const k = action === 'wave' ? Math.sin(t * 9) * 4 : Math.sin(t * 3.4) * 1.2;
      const tgt: Vec = action === 'wave' ? [hc[0] + 6 + k, hc[1] - 9] : [hc[0] + 5.6, hc[1] + 2 + k];
      const elb: Vec = action === 'wave' ? [shN[0] + 9, shN[1] + 6] : [shN[0] + 10, shN[1] + 8];
      eN = lerpV(eN, elb, act); hN = lerpV(hN, tgt, act);
      if (action === 'call') { eF = lerpV(eF, [shF[0] + 5, shF[1] + 15], act); hF = lerpV(hF, [shF[0] + 14, shF[1] + 15 + Math.sin(t * 2.2) * 1.5], act); }
    }
    // a little sway on hanging things from wind
    this.bag.step(wind * 0.2, dt);
    this.farArm.draw([shF, eF, hF], [0.2, 0.5]);
    this.nearArm.draw([shN, eN, hN], [0.2, 0.4]);
    if (this.gloves.length) {
      [hF, hN].forEach((h, i) => this.gloves[i].setAttribute('d', `M${f(h[0] - 1.8)} ${f(h[1] - 1.4)} Q${f(h[0] + 2.4)} ${f(h[1] - 2.2)} ${f(h[0] + 2.2)} ${f(h[1] + 1.6)} Q${f(h[0])} ${f(h[1] + 3)} ${f(h[0] - 1.8)} ${f(h[1] + 1.2)}Z`));
    }
  }

  /** Scene position of the phone screen (for a glow at night). */
  phoneScene(): Vec | null {
    if (!this.phoneAt) return null;
    return [this.x + this.dir * this.scale * (this.phoneAt[0] - 40), this.y + this.scale * (this.phoneAt[1] - 120)];
  }

  offscreen(x0: number, x1: number) { return this.dir > 0 ? this.x > x1 + 30 : this.x < x0 - 30; }
  remove() { this.g.remove(); }
}

function lerpV(a: Vec, b: Vec, t: number): Vec { t = clamp(t, 0, 1); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
