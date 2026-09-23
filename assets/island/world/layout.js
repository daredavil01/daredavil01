// The island's map: terrain shape, where each stop sits, where the camera
// looks from, and where every prop stands. Change the world here, not in
// the renderer. Coordinates: x east, z south, y up; one unit ≈ one castle
// wall. Heights for props default to the terrace they stand on.

export const WORLD = {
  seed: 1834, // 18°34′N
  w: 44, // x extent of the heightmap
  d: 32, // z extent
  cell: 0.25,
  step: 0.5, // height of one contour layer
  sea: 0, // water surface
  slab: { w: 46, d: 34, r: 4, depth: 3.2 },
};

// Island outline (an ellipse, warped by noise in terrain.js)
export const SHAPE = { rx: 17.5, rz: 11.8 };

// The fort mesa: a Deccan-trap table with scarp sides
export const MESA = { x: -2.2, z: -4.2, r0: 2.9, r1: 4.6, top: 15 };

// Secondary hills (x, z, radius, height in world units)
export const HILLS = [
  [4.2, -8.6, 3.2, 2.2], // observatory hill (north)
  [-12.8, -6.6, 3.4, 1.4], // lighthouse headland (north-west)
  [8.5, -5.5, 4.5, 1.8],
  [-7.5, -1.5, 4.8, 2.4],
  [2.5, 3.2, 5.5, 1.1],
];

// The river, from the mesa's east foot to its mouth on the east shore
export const RIVER = [
  [0.8, -3.0], [3.2, -2.2], [5.8, -3.0], [8.4, -1.7], [11.2, -2.5], [13.8, -1.2], [16.2, -1.8], [18.6, -1.2], [22, -1.4],
];
export const RIVER_WIDTH = [0.35, 1.0]; // at source, at mouth

// Bays cut into the coast (x, z, radius)
export const BAYS = [
  [12.2, 10.4, 3.4], // harbour (build)
  [-17.8, 5.4, 2.6], // pier cove (play)
  [5.6, -12.8, 2.4], // ferry cove (night)
];

// Flat pads for buildings: x, z, radius, terrace level
export const PADS = [
  [15.2, 1.2, 2.4, 1], // run — finish straight
  [8.6, 6.0, 2.6, 1], // build — studio + harbour
  [1.2, 7.0, 2.4, 2], // read — library
  [-8.2, 5.4, 2.8, 2], // commons
  [-15.2, 3.2, 1.8, 1], // play — pier head
  [-12.8, -6.6, 1.9, 5], // write — lighthouse
  [4.2, -8.6, 1.9, 7], // night — observatory
];

// ------------------------------------------------------------------ stops --
// Each stop: the hour it plays at, what the camera looks at, and where the
// camera stands. The rail passes through the stops in this order.
export const STOPS = [
  { id: 'island', hour: null, label: 'The island', look: [1.5, 1.2, -0.5], cam: [4, 25, 33], fov: 36 },
  { id: 'run', hour: 5.5, out: 6.6, label: 'Dawn run', look: [14.4, 0.6, 0.2], cam: [23.5, 6.8, 12.5], fov: 34 },
  { id: 'build', hour: 9.0, out: 11.5, label: 'The studio', look: [9.2, 0.9, 6.8], cam: [16.5, 7.5, 17.5], fov: 34 },
  { id: 'read', hour: 13.0, out: 14.0, label: 'The library', look: [1.3, 1.9, 6.8], cam: [5.5, 7.0, 17.0], fov: 34 },
  { id: 'climb', hour: 16.0, out: 17.5, label: 'The fort', look: [-2.4, 7.9, -4.4], cam: [9.5, 15.5, 12.5], fov: 34 },
  { id: 'commons', hour: 18.0, out: 19.0, label: 'The commons', look: [-8.2, 1.2, 5.4], cam: [-15.5, 7.0, 15.5], fov: 34 },
  { id: 'play', hour: 20.0, out: 21.0, label: 'The pavilion', look: [-16.2, 1.0, 4.8], cam: [-26, 6.0, 12], fov: 34 },
  { id: 'write', hour: 22.0, out: 23.0, label: 'The lighthouse', look: [-12.2, 4.4, -6.2], cam: [-21.5, 8.0, 7.5], fov: 36 },
  { id: 'night', hour: 24.5, out: 25.0, label: 'The observatory', look: [4.2, 4.2, -8.6], cam: [9, 12, 6.5], fov: 38 },
  { id: 'map', hour: null, label: 'The whole map', look: [0, 0.5, 0.5], cam: [0, 31, 15], fov: 38 },
];

// Fixed shots for tools/capture.mjs (README banners, social card)
export const SHOTS = {
  banner: { cam: [1.5, 18.5, 33], look: [0.3, 1.6, 0.8], fov: 30 },
  og: { cam: [3, 19.5, 30], look: [0.2, 1.8, 0.6], fov: 34 },
};
// Hour each classic-view still is drawn at (daylight keeps the hatching readable)
export const STILL_HOURS = { island: 10, run: 7.3, build: 10, read: 13, climb: 16, commons: 17, play: 16.5, write: 15, night: 11, map: 12 };

// Hotspot anchors (click targets) — world position + radius, per stop and per card slug.
export const HOTSPOTS = {
  run: [15.2, 1.4, 1.2, 2.2],
  build: [8.6, 1.4, 6.0, 2.2],
  read: [1.2, 2.6, 7.0, 2.0],
  climb: [-2.2, 7.0, -4.2, 2.6],
  commons: [-8.2, 1.8, 5.4, 2.4],
  play: [-16.4, 1.2, 5.0, 2.0],
  write: [-12.8, 5.0, -6.6, 2.0],
  night: [4.2, 4.6, -8.6, 2.0],
};

// Field-note anchors (world positions)
export const NOTES = {
  'pb-marathon': [17.6, 0.8, 2.4],
  'ultra-lonavala': [11.4, 0.6, -0.4],
  'chunks': [0.2, 2.2, 8.4],
  'genres': [2.4, 1.6, 5.6],
  'pawankhind': [-0.6, 6.6, -2.8],
  'sinhgad': [-4.4, 4.2, -1.8],
  'households': [-6.6, 1.4, 7.2],
  'ghost-mode': [-17.2, 1.0, 6.4],
  'posts': [-11.6, 3.2, -5.2],
  'still-up': [5.4, 3.6, -10.2],
  'first-5k': [13.2, 0.6, 3.4],
  'nast': [-9.8, 1.4, 3.6],
};

// Base scale per prototype, so every kit reads at one island scale.
export const PROTO_SCALE = {
  fort_wall: 0.62, fort_wall_half: 0.62, fort_corner: 0.62, fort_gate: 0.62,
  fort_tower_base: 0.7, fort_tower_mid: 0.7, fort_tower_top: 0.7, fort_tower_roof: 0.7,
  flag: 0.6, flag_banner: 0.45, stairs_stone: 0.6,
  library_base: 0.9, library_mid: 0.9, library_top: 0.9, archive_wing: 1.5,
  studio: 1.9, studio_awning: 1.9, watermill: 1.1, mill_wheel: 1.1,
  cargo_pile: 0.32, crate: 0.35, barrel: 0.3,
  finish_gate: 0.36, lantern: 0.55, signpost: 1.2,
  school: 1.6, stall: 0.6, bench: 0.9, fountain: 0.7,
  pavilion_platform: 0.55, pavilion_roof: 0.55, dock: 0.55, dock_small: 0.55,
  lighthouse_tower: 0.42, cottage: 1.4,
  observatory_base: 1.0, observatory_mid: 1.0,
  boat_sail: 0.3, boat_sail_b: 0.3, boat_row: 0.3, boat_fishing: 0.32, ferry: 0.36, buoy: 0.22,
  tree_oak: 0.95, tree_default: 0.85, tree_fat: 0.95, tree_pine: 1.05, tree_pine_round: 0.95, tree_palm: 1.1, tree_thin: 0.9,
  bush: 1.2, rock_large: 1.3, rock_tall: 1.1, rock_small: 1.6, tent: 0.8, campfire: 0.8, log_stack: 0.9,
};

// ------------------------------------------------------------------ props --
// { p: prototype, x, z, ry (deg), s (extra scale), dy (lift), y (absolute) }
const P = [];
const add = (stop, p, x, z, o = {}) => P.push({ stop, p, x, z, ...o });

// RUN — river mouth, finish straight, lamp posts
add('run', 'finish_gate', 15.6, 1.4, { ry: 90 });
for (const [x, z] of [[13.2, 0.4], [14.4, 0.4], [16.8, 0.4], [18, 0.4], [13.2, 2.4], [18, 2.4]]) add('run', 'lantern', x, z);
add('run', 'flag', 12.4, 2.6, { ry: 20 });
add('run', 'flag', 18.6, 2.2, { ry: -30 });
add('run', 'signpost', 12.2, 1.4, { ry: 60 });
add('run', 'tent', 17.2, 3.0, { ry: 200 });
add('run', 'buoy', 20.5, -1.3, { y: 0 });

// BUILD — harbour studio, awning, cargo, crates, dock, boats
add('build', 'studio', 8.2, 5.4, { ry: 180 });
add('build', 'studio_awning', 8.2, 5.4, { ry: 180 });
add('build', 'watermill', 6.9, -3.1, { ry: 0, dy: -0.2 });
add('build', 'dock', 10.9, 8.2, { ry: 0, y: -0.25 });
add('build', 'cargo_pile', 9.9, 7.1, { ry: 15 });
add('build', 'crate', 7.0, 7.0, { ry: 30 });
add('build', 'crate', 6.6, 6.6, { ry: 70 });
add('build', 'barrel', 9.6, 4.2, {});
add('build', 'boat_fishing', 12.6, 10.6, { ry: 30, y: 0 });
add('build', 'boat_row', 13.9, 8.8, { ry: -40, y: 0 });

// READ — library tower + archive wing
add('read', 'library_base', 1.2, 7.2, {});
add('read', 'library_mid', 1.2, 7.2, { dy: 0.91 });
add('read', 'library_mid', 1.2, 7.2, { dy: 1.82 });
add('read', 'library_top', 1.2, 7.2, { dy: 2.73 });
add('read', 'archive_wing', 2.7, 6.3, { ry: -90 });
add('read', 'bench', 0.0, 8.6, { ry: 90 });
add('read', 'lantern', -0.2, 6.2, {});

// CLIMB — fort ring on the mesa, keep, flags, a tent and fire below
{
  const cx = -2.2, cz = -4.2, half = 1.55, n = 4, seg = (2 * half) / n;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < n; i++) {
      const t = -half + seg * (i + 0.5);
      const [x, z, ry] = [
        [cx + t, cz - half, 0],
        [cx + half, cz + t, 90],
        [cx + t, cz + half, 0],
        [cx - half, cz + t, 90],
      ][side];
      const gate = side === 2 && i === 1;
      add('climb', gate ? 'fort_gate' : 'fort_wall', x, z, { ry, s: seg / 0.62 });
    }
  }
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = cx + dx * half, z = cz + dz * half;
    add('climb', 'fort_tower_base', x, z, {});
    add('climb', 'fort_tower_mid', x, z, { dy: 0.92 });
    add('climb', 'fort_tower_top', x, z, { dy: 1.24 });
    add('climb', 'fort_tower_roof', x, z, { dy: 1.33 });
  }
  add('climb', 'library_base', cx - 0.2, cz - 0.3, { s: 0.8 });
  add('climb', 'library_mid', cx - 0.2, cz - 0.3, { s: 0.8, dy: 0.72 });
  add('climb', 'flag_banner', cx - 0.2, cz - 0.3, { dy: 1.45 });
  add('climb', 'flag', cx + half, cz - half, { dy: 1.9 });
  add('climb', 'tent', -5.4, -1.2, { ry: 30 });
  add('climb', 'campfire', -4.7, -0.7, {});
}

// COMMONS — banyan (procedural), chaupal, school, stall, benches, fountain
add('commons', 'school', -10.0, 4.2, { ry: 160 });
add('commons', 'stall', -6.6, 6.6, { ry: -30 });
add('commons', 'bench', -7.2, 4.4, { ry: 0 });
add('commons', 'bench', -9.0, 6.4, { ry: 90 });
add('commons', 'fountain', -6.4, 4.4, {});
add('commons', 'signpost', -7.0, 7.2, { ry: -20 });
add('commons', 'lantern', -9.6, 6.8, {});

// PLAY — pier, pavilion, lanterns, boats
add('play', 'dock', -16.6, 4.4, { ry: 90, y: -0.25 });
add('play', 'dock_small', -18.0, 5.6, { ry: 90, y: -0.25 });
add('play', 'pavilion_platform', -16.6, 4.4, { y: 0.3 });
add('play', 'pavilion_roof', -16.6, 4.4, { y: 0.8 });
add('play', 'lantern', -15.0, 5.4, {});
add('play', 'lantern', -15.0, 3.2, {});
add('play', 'boat_sail', -19.5, 7.8, { ry: 120, y: 0 });
add('play', 'boat_row', -18.8, 2.6, { ry: 70, y: 0 });

// WRITE — lighthouse + keeper's cottage
add('write', 'lighthouse_tower', -12.8, -6.6, {});
add('write', 'cottage', -11.2, -5.4, { ry: 200 });
add('write', 'barrel', -11.8, -7.8, {});

// NIGHT — observatory + ferry dock
add('night', 'observatory_base', 4.2, -8.6, {});
add('night', 'observatory_mid', 4.2, -8.6, { dy: 1.0 });
add('night', 'dock_small', 5.6, -11.9, { ry: 0, y: -0.25 });
add('night', 'ferry', 7.4, -13.4, { ry: 60, y: 0 });
add('night', 'boat_sail_b', -3.5, -14.5, { ry: -20, y: 0 });

export const PROPS = P;

// Tree scatter tuning
export const FLORA = {
  count: 115,
  keepOut: [...PADS.map(([x, z, r]) => [x, z, r + 0.6]), [-2.2, -4.2, 3.0]],
  byLevel: [
    // [minLevel, maxLevel, prototypes]
    [1, 1, ['tree_palm', 'bush', 'tree_palm']],
    [2, 5, ['tree_oak', 'tree_thin', 'bush', 'tree_pine_round', 'tree_oak']],
    [6, 10, ['tree_pine_round', 'tree_pine', 'rock_tall', 'tree_pine']],
    [11, 16, ['tree_pine', 'rock_tall', 'rock_large']],
  ],
};

// Runner loop along the river's south bank and back over the finish line
export const RUN_LOOP = [
  [18.6, 0.8], [16.8, 1.3], [15.2, 1.4], [13.2, 1.3], [11.4, 0.2], [9.2, 0.4], [7.6, -0.4], [6.4, -0.2], [7.8, 1.2], [10.4, 1.8], [12.8, 2.6], [15.2, 2.2], [17.6, 2.6], [19.4, 1.8],
];

// The trail up to the fort (switchbacks on the south face)
export const TRAIL = [
  [-5.6, 1.6], [-4.0, 1.0], [-5.0, 0.0], [-3.2, -0.5], [-4.4, -1.4], [-2.6, -1.8], [-3.4, -2.4], [-2.2, -2.6],
];
