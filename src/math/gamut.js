import quickhull from 'quickhull3d';

// ─── Vector math ──────────────────────────────────────────────────────────────

const sub  = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot  = (a, b) =>  a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a, b) => [
  a[1]*b[2] - a[2]*b[1],
  a[2]*b[0] - a[0]*b[2],
  a[0]*b[1] - a[1]*b[0],
];
const normalize = v => {
  const len = Math.sqrt(dot(v, v));
  return len === 0 ? v : v.map(x => x / len);
};

// ─── Build planes from hull faces ─────────────────────────────────────────────

/**
 * Given palette colors and quickhull face indices, compute outward-facing
 * plane equations for each triangular face.
 *
 * @param {number[][]} points  - Array of [r,g,b] palette colors
 * @param {number[][]} faces   - Array of [i,j,k] face index triples from quickhull3d
 * @param {number[]}   centroid - Interior point (average of all palette colors)
 * @returns {{ normal: number[], d: number }[]}
 */
function buildPlanes(points, faces, centroid) {
  return faces.map(([i, j, k]) => {
    const a = points[i], b = points[j], c = points[k];
    const normal = normalize(cross(sub(b, a), sub(c, a)));
    const d = -dot(normal, a);

    // Ensure normal points outward (away from centroid)
    if (dot(normal, centroid) + d > 0) {
      return { normal: normal.map(x => -x), d: -d };
    }
    return { normal, d };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a gamut checker from an array of palette colors.
 *
 * @param {number[][]} palette - Array of [r,g,b] colors (values 0–255)
 * @returns {{ isInside: function, planes: object[], faces: number[][] }}
 */
export function buildGamut(palette) {
  if (palette.length < 4) {
    throw new Error('Need at least 4 non-coplanar colors to form a 3D convex hull.');
  }

  const faces = quickhull(palette);

  const centroid = palette
    .reduce((acc, p) => [acc[0]+p[0], acc[1]+p[1], acc[2]+p[2]], [0,0,0])
    .map(v => v / palette.length);

  const planes = buildPlanes(palette, faces, centroid);

  /**
   * Test if a color [r,g,b] lies inside the palette's gamut.
   *
   * @param {number[]} color     - [r,g,b] to test
   * @param {number}   tolerance - Positive = strict inside; negative = allow slight outside
   * @returns {boolean}
   */
  function isInside(color, tolerance = 1e-6) {
    for (const { normal, d } of planes) {
      if (dot(normal, color) + d > tolerance) return false;
    }
    return true;
  }

  return { isInside, planes, faces };
}

/**
 * How far outside the gamut is a color? (0 = inside or on boundary)
 * Useful for soft checks or gamut-mapping.
 *
 * @param {number[]} color
 * @param {{ normal: number[], d: number }[]} planes
 * @returns {number} Max signed distance across all planes (negative = inside)
 */
export function gamutDistance(color, planes) {
  return Math.max(...planes.map(({ normal, d }) => dot(normal, color) + d));
}