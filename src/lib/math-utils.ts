import {Line, Point, Intersection} from '../types';

export function calculateSlope(p1: {x: number; y: number}, p2: {x: number; y: number}): number {
  if (p1.x === p2.x) return Infinity;
  return (p2.y - p1.y) / (p2.x - p1.x);
}

export function calculateIntercept(p: {x: number; y: number}, m: number): number {
  if (m === Infinity) return p.x; // For vertical lines, b is the x-intercept
  return p.y - m * p.x;
}

export function parseEquation(eq: string): {m: number; b: number} | null {
  // Remove all spaces and convert to lowercase
  let cleaned = eq.replace(/\s/g, '').toLowerCase();
  if (cleaned === '') return null;

  // Pattern for x = k (Vertical lines)
  const verticalMatch = cleaned.match(/^x=([-+]?\d*\.?\d+)$/);
  if (verticalMatch) {
    const val = parseFloat(verticalMatch[1]);
    return isNaN(val) ? null : { m: Infinity, b: val };
  }

  // If it starts with x= but didn't match the simple number, it's invalid for this tool
  if (cleaned.startsWith('x=')) return null;

  // Handle y = mx + b
  if (cleaned.startsWith('y=')) {
    cleaned = cleaned.substring(2);
  }

  // Regex to capture m and b components
  // Group 1: m (with x)
  // Group 2: b (constant)
  // Handles: 2x+1, -x-3, .5x, 4, etc.
  
  // Case 1: Just a constant (y = b)
  if (!cleaned.includes('x')) {
    const b = parseFloat(cleaned);
    return isNaN(b) ? null : { m: 0, b };
  }

  // Case 2: mx or mx + b
  // Split by x
  const parts = cleaned.split('x');
  let mStr = parts[0];
  let bStr = parts[1] || '0';

  let m = 1;
  if (mStr === '' || mStr === '+') m = 1;
  else if (mStr === '-') m = -1;
  else m = parseFloat(mStr);

  let b = 0;
  if (bStr !== '') {
    // If b part exists, it should start with + or -
    b = parseFloat(bStr);
  }

  if (isNaN(m) || isNaN(b)) return null;
  return { m, b };
}

export function findIntersection(l1: Line, l2: Line, points: Point[]): Intersection | null {
  let m1 = l1.m;
  let b1 = l1.b;
  let m2 = l2.m;
  let b2 = l2.b;

  // If points-based, calculate m and b
  if (l1.type === 'points') {
    const p1 = points.find(p => p.id === l1.point1Id);
    const p2 = points.find(p => p.id === l1.point2Id);
    if (p1 && p2) {
      m1 = calculateSlope(p1, p2);
      b1 = calculateIntercept(p1, m1);
    }
  }

  if (l2.type === 'points') {
    const p1 = points.find(p => p.id === l2.point1Id);
    const p2 = points.find(p => p.id === l2.point2Id);
    if (p1 && p2) {
      m2 = calculateSlope(p1, p2);
      b2 = calculateIntercept(p1, m2);
    }
  }

  if (m1 === undefined || b1 === undefined || m2 === undefined || b2 === undefined) return null;

  // Parallel lines
  if (m1 === m2) return null;

  let x: number;
  let y: number;

  if (m1 === Infinity) {
    x = b1; // x = k
    y = m2 * x + b2;
  } else if (m2 === Infinity) {
    x = b2;
    y = m1 * x + b1;
  } else {
    // m1*x + b1 = m2*x + b2
    // (m1 - m2)*x = b2 - b1
    x = (b2 - b1) / (m1 - m2);
    y = m1 * x + b1;
  }

  return {x, y, line1Id: l1.id, line2Id: l2.id};
}

export function formatEquation(m: number, b: number): string {
  if (m === Infinity) return `x = ${b.toFixed(2)}`;
  if (m === 0) return `y = ${b.toFixed(2)}`;
  
  const mPart = m === 1 ? 'x' : m === -1 ? '-x' : `${m.toFixed(2)}x`;
  const bPart = b === 0 ? '' : b > 0 ? ` + ${b.toFixed(2)}` : ` - ${Math.abs(b).toFixed(2)}`;
  
  return `y = ${mPart}${bPart}`;
}

export function checkRelationship(m1: number, m2: number): 'parallel' | 'perpendicular' | 'none' {
  if (m1 === m2) return 'parallel';
  if ((m1 === 0 && m2 === Infinity) || (m1 === Infinity && m2 === 0)) return 'perpendicular';
  if (Math.abs(m1 * m2 + 1) < 0.00001) return 'perpendicular';
  return 'none';
}
