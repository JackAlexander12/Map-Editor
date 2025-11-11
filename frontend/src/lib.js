// consts
export const DIRS = ['North', 'East', 'South', 'West'];
export const MM_PER_GRID = 250; // grid size in mm

// utils
export const snap = (v, step = MM_PER_GRID) => Math.round(v / step) * step;

// math
export const rotatePoint90 = ({ x, y }) => ({ x: -y, y: x });

// ids
export const k = (obj) => String(obj?.code ?? '');

// data cleanup
export const scrubOptional = (obj) => {
  if (obj == null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val && typeof val === 'object') {
      const child = scrubOptional(val);
      if (Array.isArray(child) && child.length === 0) continue;
      if (!Array.isArray(child) && Object.keys(child).length === 0) continue;
      out[key] = child;
    } else {
      out[key] = val;
    }
  }
  return out;
};

