/**
 * math.js - Math and bounding box utilities
 */

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Axis-Aligned Bounding Box intersection
export function aabbIntersect(r1, r2) {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

// Point in box
export function pointInBox(px, py, box) {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
}
