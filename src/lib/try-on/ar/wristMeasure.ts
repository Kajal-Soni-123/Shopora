/**
 * Measures the customer's actual forearm in a photo from a skin segmentation mask, so the
 * product can be centred on the arm and sized to that person's wrist rather than an average one.
 * All coordinates are photo pixels with y pointing down.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Category mask from MediaPipe's selfie_multiclass model, at any resolution. */
export interface SkinMask {
  data: Uint8Array;
  width: number;
  height: number;
}

/** selfie_multiclass_256x256 categories: 2 = body skin, 3 = face skin. */
const SKIN_CATEGORIES = new Set([2, 3]);

/** Gaps this many pixels wide (veins, shadows, mask noise) don't end the arm. */
const MAX_GAP_PX = 3;

/** Distances from the wrist crease, toward the elbow, where the arm's width is sampled. */
const SAMPLE_DISTANCES_M = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04];

export interface ForearmMeasurement {
  /** Centre of the forearm where the watch sits. */
  centre: Vec2;
  /** Unit vector along the forearm, toward the elbow. */
  towardElbow: Vec2;
  /** Visible width of the forearm across the arm, in pixels. */
  widthPx: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isSkinAt(mask: SkinMask, photoWidth: number, photoHeight: number, p: Vec2): boolean {
  const x = Math.floor((p.x / photoWidth) * mask.width);
  const y = Math.floor((p.y / photoHeight) * mask.height);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return SKIN_CATEGORIES.has(mask.data[y * mask.width + x]);
}

/** Distance from `from` along `dir` to the last skin pixel, or null if `from` isn't on skin. */
function skinExtent(
  mask: SkinMask,
  photoWidth: number,
  photoHeight: number,
  from: Vec2,
  dir: Vec2,
  maxDistance: number
): number | null {
  if (!isSkinAt(mask, photoWidth, photoHeight, from)) return null;
  let lastSkin = 0;
  for (let d = 1; d <= maxDistance; d++) {
    if (isSkinAt(mask, photoWidth, photoHeight, { x: from.x + dir.x * d, y: from.y + dir.y * d })) {
      lastSkin = d;
    } else if (d - lastSkin > MAX_GAP_PX) {
      return lastSkin;
    }
  }
  // Still skin at the search limit: the edge wasn't found, so this sample isn't trustworthy.
  return null;
}

/**
 * Finds the forearm's centre line and width just above the wrist.
 * `wrist` and `towardElbow` come from the hand landmarks; the mask corrects them to the real arm.
 */
export function measureForearm(
  mask: SkinMask,
  photoWidth: number,
  photoHeight: number,
  wrist: Vec2,
  towardElbow: Vec2,
  pixelsPerMeter: number,
  watchOffsetM: number
): ForearmMeasurement | null {
  const across = { x: -towardElbow.y, y: towardElbow.x };
  const maxHalfWidth = Math.ceil(0.06 * pixelsPerMeter);

  const samples: Array<{ distance: number; centre: Vec2; width: number }> = [];
  for (const distanceM of SAMPLE_DISTANCES_M) {
    const distance = distanceM * pixelsPerMeter;
    const p = { x: wrist.x + towardElbow.x * distance, y: wrist.y + towardElbow.y * distance };
    const positive = skinExtent(mask, photoWidth, photoHeight, p, across, maxHalfWidth);
    const negative = skinExtent(mask, photoWidth, photoHeight, p, { x: -across.x, y: -across.y }, maxHalfWidth);
    if (positive === null || negative === null) continue;
    const shift = (positive - negative) / 2;
    samples.push({
      distance,
      centre: { x: p.x + across.x * shift, y: p.y + across.y * shift },
      width: positive + negative,
    });
  }
  if (samples.length < 3) return null;

  // Drop samples where the scan leaked into the hand, sleeve or background.
  const typicalWidth = median(samples.map((s) => s.width));
  const good = samples.filter((s) => Math.abs(s.width - typicalWidth) <= typicalWidth * 0.25);
  if (good.length < 3) return null;

  // Principal axis of the centre points is the forearm's direction.
  const mean = {
    x: good.reduce((sum, s) => sum + s.centre.x, 0) / good.length,
    y: good.reduce((sum, s) => sum + s.centre.y, 0) / good.length,
  };
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const { centre } of good) {
    const dx = centre.x - mean.x;
    const dy = centre.y - mean.y;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let direction = { x: Math.cos(angle), y: Math.sin(angle) };
  if (direction.x * towardElbow.x + direction.y * towardElbow.y < 0) direction = { x: -direction.x, y: -direction.y };
  // A nearly straight column of samples gives a noisy angle; fall back to the hand's direction.
  if (Math.abs(direction.x * towardElbow.x + direction.y * towardElbow.y) < Math.cos(Math.PI / 6)) direction = towardElbow;

  // Place the watch on the centre line, `watchOffsetM` up the arm from the wrist crease.
  const along = (wrist.x - mean.x) * direction.x + (wrist.y - mean.y) * direction.y + watchOffsetM * pixelsPerMeter;
  const centre = { x: mean.x + direction.x * along, y: mean.y + direction.y * along };

  return { centre, towardElbow: direction, widthPx: median(good.map((s) => s.width)) };
}
