export interface Point {
  id: string;
  x: number;
  y: number;
  color: string;
  label?: string;
}

export interface Line {
  id: string;
  point1Id?: string;
  point2Id?: string;
  equation?: string; // e.g., "y = 2x + 3"
  color: string;
  m?: number;
  b?: number;
  type: 'points' | 'equation';
  thickness?: number;
  dashStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface Intersection {
  x: number;
  y: number;
  line1Id: string;
  line2Id: string;
}

export interface GraphState {
  points: Point[];
  lines: Line[];
  intersections: Intersection[];
  zoom: number;
  pan: { x: number; y: number };
}
