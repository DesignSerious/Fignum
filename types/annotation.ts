export interface Annotation {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  number: number;
  endType: 'dot' | 'arrow' | 'none';
  lineType: 'straight' | 'curved' | 's-curved';
  page: number;
  curveFlipped?: boolean; // For single-direction curves
  curvature?: number; // Curvature intensity (0-100)
}

export interface AnnotationHistory {
  past: Annotation[][];
  present: Annotation[];
  future: Annotation[][];
}

export interface PendingAnnotation {
  startX: number;
  startY: number;
  number: number;
  lineType: 'straight' | 'curved' | 's-curved';
  page: number;
}