import { distance } from "./geo";
import type { Location, WalkingInstruction } from "@/types/database";
export type Coord = [number, number];
export type WalkGraph = {
  version: number;
  coverage?: [number, number, number, number];
  source: string;
  osm_timestamp: string;
  nodes: Coord[];
  names: string[];
  edges: [number, number, number, number, number, number][];
};
export function inPolygon(p: Coord, poly: Coord[]) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
function crosses(a: Coord, b: Coord, c: Coord, d: Coord) {
  const cross = (p: Coord, q: Coord, r: Coord) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const x = cross(a, b, c),
    y = cross(a, b, d),
    z = cross(c, d, a),
    w = cross(c, d, b);
  return x * y < 0 && z * w < 0;
}
export function avoids(a: Coord, b: Coord, polys: Coord[][]) {
  return !polys.some(
    (poly) =>
      inPolygon(a, poly) ||
      inPolygon(b, poly) ||
      poly.some((p, i) => i > 0 && crosses(a, b, poly[i - 1], p)),
  );
}
class Heap {
  a: { node: number; score: number; cost: number }[] = [];
  push(v: { node: number; score: number; cost: number }) {
    let i = this.a.length;
    this.a.push(v);
    while (i) {
      const p = (i - 1) >> 1;
      if (this.a[p].score <= v.score) break;
      this.a[i] = this.a[p];
      i = p;
    }
    this.a[i] = v;
  }
  pop() {
    const first = this.a[0],
      v = this.a.pop()!;
    if (this.a.length) {
      let i = 0;
      while (i * 2 + 1 < this.a.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.a.length && this.a[c + 1].score < this.a[c].score) c++;
        if (this.a[c].score >= v.score) break;
        this.a[i] = this.a[c];
        i = c;
      }
      this.a[i] = v;
    }
    return first;
  }
}
export class PedestrianGraph {
  adjacency: { to: number; edge: number }[][];
  grid = new Map<string, number[]>();
  constructor(
    public data: WalkGraph,
    public maxSnapMeters = 150,
  ) {
    this.adjacency = data.nodes.map(() => []);
    data.edges.forEach((e, id) => {
      this.adjacency[e[0]].push({ to: e[1], edge: id });
      if (e[4] & 1) this.adjacency[e[1]].push({ to: e[0], edge: id });
      const a = data.nodes[e[0]],
        b = data.nodes[e[1]],
        steps = Math.max(
          1,
          Math.ceil(
            Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) / 0.0015,
          ),
        );
      const keys = new Set<string>();
      for (let k = 0; k <= steps; k++)
        keys.add(
          this.key(
            a[0] + ((b[0] - a[0]) * k) / steps,
            a[1] + ((b[1] - a[1]) * k) / steps,
          ),
        );
      for (const key of keys) {
        const list = this.grid.get(key) || [];
        list.push(id);
        this.grid.set(key, list);
      }
    });
  }
  key(lon: number, lat: number) {
    return `${Math.floor(lon / 0.003)},${Math.floor(lat / 0.003)}`;
  }
  snap(p: Location, polys: Coord[][]) {
    const [x, y] = this.key(p.longitude, p.latitude).split(",").map(Number),
      candidates = new Set<number>();
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const id of this.grid.get(`${x + dx},${y + dy}`) || [])
          candidates.add(id);
    let best:
      { edge: number; t: number; point: Coord; distance: number } | undefined;
    for (const id of candidates) {
      const e = this.data.edges[id],
        a = this.data.nodes[e[0]],
        b = this.data.nodes[e[1]];
      if (!avoids(a, b, polys)) continue;
      const scale = Math.cos((p.latitude * Math.PI) / 180),
        dx = (b[0] - a[0]) * scale,
        dy = b[1] - a[1],
        length = dx * dx + dy * dy;
      const t = length
        ? Math.max(
            0,
            Math.min(
              1,
              ((p.longitude - a[0]) * scale * dx + (p.latitude - a[1]) * dy) /
                length,
            ),
          )
        : 0;
      const point: Coord = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
        meters = distance(p, { longitude: point[0], latitude: point[1] });
      if (!best || meters < best.distance)
        best = { edge: id, t, point, distance: meters };
    }
    if (!best || best.distance > this.maxSnapMeters)
      throw new Error(
        `No mapped network path within ${this.maxSnapMeters} m of this point. Select a mapped entrance or nearby footpath.`,
      );
    return best;
  }
  route(from: Location, to: Location, polys: Coord[][] = []) {
    const box = this.data.coverage;
    if (
      box &&
      [from, to].some(
        (p) =>
          p.longitude < box[0] ||
          p.longitude > box[2] ||
          p.latitude < box[1] ||
          p.latitude > box[3],
      )
    )
      throw new Error(
        "This point is outside the bundled Doha walking pilot. Use a configured pedestrian provider for other areas.",
      );
    const start = this.snap(from, polys),
      end = this.snap(to, polys),
      se = this.data.edges[start.edge],
      ee = this.data.edges[end.edge];
    const queue = new Heap(),
      costs = new Float64Array(this.data.nodes.length).fill(Infinity),
      parents = new Int32Array(this.data.nodes.length).fill(-1),
      parentEdges = new Int32Array(this.data.nodes.length).fill(-1);
    const heuristic = (id: number) =>
      distance(
        { longitude: this.data.nodes[id][0], latitude: this.data.nodes[id][1] },
        { longitude: end.point[0], latitude: end.point[1] },
      );
    const add = (id: number, cost: number, parent: number, edge: number) => {
      if (cost >= costs[id]) return;
      costs[id] = cost;
      parents[id] = parent;
      parentEdges[id] = edge;
      queue.push({ node: id, cost, score: cost + heuristic(id) });
    };
    add(se[1], (1 - start.t) * se[2], -1, start.edge);
    if (se[4] & 1) add(se[0], start.t * se[2], -1, start.edge);
    const goals = new Map<number, number>([[ee[0], end.t * ee[2]]]);
    if (ee[4] & 1) goals.set(ee[1], (1 - end.t) * ee[2]);
    let best = Infinity,
      last = -1,
      visits = 0;
    const same = start.edge === end.edge && (se[4] & 1 || end.t >= start.t);
    if (same) best = Math.abs(end.t - start.t) * se[2];
    while (queue.a.length) {
      const q = queue.pop();
      if (q.score >= best) break;
      if (q.cost !== costs[q.node]) continue;
      if (++visits > 250000)
        throw new Error(
          "This walking search is too large. Choose a closer destination.",
        );
      const tail = goals.get(q.node);
      if (tail !== undefined && q.cost + tail < best) {
        best = q.cost + tail;
        last = q.node;
      }
      for (const next of this.adjacency[q.node]) {
        const e = this.data.edges[next.edge];
        if (!avoids(this.data.nodes[e[0]], this.data.nodes[e[1]], polys))
          continue;
        add(next.to, q.cost + e[2], q.node, next.edge);
      }
    }
    if (!Number.isFinite(best))
      throw new Error(
        "No connected walking path was found in the bundled OSM network. Choose public entrances or configure a full pedestrian provider.",
      );
    const ids: number[] = [],
      edgeIds: number[] = [];
    for (let p = last; p >= 0; p = parents[p]) {
      ids.push(p);
      edgeIds.push(parentEdges[p]);
    }
    ids.reverse();
    edgeIds.reverse();
    const coordinates: Coord[] = [start.point];
    for (const id of ids) {
      const p = this.data.nodes[id];
      if (
        distance(
          {
            longitude: coordinates.at(-1)![0],
            latitude: coordinates.at(-1)![1],
          },
          { longitude: p[0], latitude: p[1] },
        ) > 0.05
      )
        coordinates.push(p);
    }
    if (
      coordinates.length === 1 ||
      end.point[0] !== coordinates.at(-1)![0] ||
      end.point[1] !== coordinates.at(-1)![1]
    )
      coordinates.push(end.point);
    const instructions: WalkingInstruction[] = [
      {
        text: "Join the mapped pedestrian path. Check crossings and access on the ground.",
        pointIndex: 0,
      },
    ];
    let previous = -1;
    for (let i = 0; i < edgeIds.length; i++) {
      const name = this.data.edges[edgeIds[i]][3];
      if (name !== previous) {
        instructions.push({
          text: `Continue along ${this.data.names[name]}.`,
          pointIndex: Math.min(i, coordinates.length - 1),
        });
        previous = name;
      }
    }
    instructions.push({
      text: "Arrive at the mapped path nearest your destination.",
      pointIndex: coordinates.length - 1,
    });
    return {
      coordinates,
      minutes: Math.max(1, Math.ceil(best / 75)),
      distance: Math.round(best),
      instructions,
      source: "Bundled Doha OSM pedestrian network (pilot)",
      networkDate: this.data.osm_timestamp,
      snappedFrom: start.distance,
      snappedTo: end.distance,
    };
  }
}
