// SHARED RENDERING SYSTEM - Used by BOTH editor and PDF export
// This ensures 100% mathematical consistency between what you see and what you get

export interface RenderPoint {
  x: number;
  y: number;
}

export interface RenderPath {
  segments: RenderPoint[];
  strokeWidth: number;
  color?: string; // NEW: Optional color for path segments
}

export interface RenderArrow {
  points: RenderPoint[];
  strokeWidth: number;
}

export interface RenderCircle {
  center: RenderPoint;
  radius: number;
}

export interface RenderText {
  text: string;
  position: RenderPoint;
  fontSize: number;
  backgroundColor: RenderPoint[];
}

export interface RenderedAnnotation {
  path: RenderPath;
  whitePath?: RenderPath; // NEW: Optional white path for initial straight segment
  arrow?: RenderArrow;
  circle?: RenderCircle;
  text: RenderText;
}

// SINGLE SOURCE OF TRUTH for all curve calculations
export const renderAnnotation = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  lineType: 'straight' | 'curved' | 's-curved',
  endType: 'dot' | 'arrow' | 'none',
  number: number,
  curvature: number = 50,
  curveFlipped: boolean = false,
  numberSize: number = 45,
  endingSize: number = 28,
  coordinateSystem: 'editor' | 'pdf' = 'editor',
  pageHeight?: number,
  lineGap: number = 8
): RenderedAnnotation => {
  
  // Convert coordinates if needed for PDF (flip Y axis)
  let actualStartX = startX;
  let actualStartY = startY;
  let actualEndX = endX;
  let actualEndY = endY;
  
  if (coordinateSystem === 'pdf' && pageHeight !== undefined) {
    actualStartY = pageHeight - startY;
    actualEndY = pageHeight - endY;
  }
  
  // Calculate text background dimensions
  const textBackground = calculateTextBackground(actualStartX, actualStartY, number.toString(), numberSize);
  
  // CRITICAL: The direction from NUMBER CENTER to end point (this is our target direction)
  const centerToEndDx = actualEndX - actualStartX;
  const centerToEndDy = actualEndY - actualStartY;
  const centerToEndLength = Math.sqrt(centerToEndDx * centerToEndDx + centerToEndDy * centerToEndDy);
  
  // Calculate where the visible line should start (offset from number center)
  let lineStartX = actualStartX;
  let lineStartY = actualStartY;
  
  if (centerToEndLength > 0) {
    const textWidth = textBackground[1].x - textBackground[0].x;
    const textHeight = textBackground[2].y - textBackground[1].y;
    const textRadius = Math.max(textWidth, textHeight) / 2;
    const totalOffset = textRadius + lineGap;
    
    const dirX = centerToEndDx / centerToEndLength;
    const dirY = centerToEndDy / centerToEndLength;
    
    lineStartX = actualStartX + dirX * totalOffset;
    lineStartY = actualStartY + dirY * totalOffset;
  }
  
  // Calculate path segments
  const pathSegments: RenderPoint[] = [];
  const whitePathSegments: RenderPoint[] = []; // NEW: For white initial segment
  let arrowAngle = 0;
  
  if (lineType === 'straight') {
    // Straight line calculation
    let lineEndX = actualEndX;
    let lineEndY = actualEndY;
    
    if (endType === 'arrow') {
      arrowAngle = Math.atan2(actualEndY - lineStartY, actualEndX - lineStartX);
      lineEndX = actualEndX - endingSize * Math.cos(arrowAngle);
      lineEndY = actualEndY - endingSize * Math.sin(arrowAngle);
    }
    
    pathSegments.push({ x: lineStartX, y: lineStartY });
    pathSegments.push({ x: lineEndX, y: lineEndY });
    
  } else if (lineType === 'curved') {
    // REVOLUTIONARY APPROACH: Create a "virtual" curve that starts from the number center
    // but only render the visible portion that starts from lineStartX,Y
    
    const safeCurvature = Math.max(0, Math.min(100, curvature || 0));
    
    if (safeCurvature === 0) {
      // 0% curvature = straight line
      let lineEndX = actualEndX;
      let lineEndY = actualEndY;
      
      if (endType === 'arrow') {
        arrowAngle = Math.atan2(centerToEndDy, centerToEndDx);
        lineEndX = actualEndX - endingSize * Math.cos(arrowAngle);
        lineEndY = actualEndY - endingSize * Math.sin(arrowAngle);
      }
      
      pathSegments.push({ x: lineStartX, y: lineStartY });
      pathSegments.push({ x: lineEndX, y: lineEndY });
    } else {
      // BREAKTHROUGH: Create a virtual curve that starts from the number center
      // with the exact tangent we want, then extract only the visible portion
      
      // Step 1: Create the "ideal" curve from number center to end point
      const idealStartX = actualStartX;
      const idealStartY = actualStartY;
      
      // Step 2: Calculate control point for the ideal curve
      const curvatureMultiplier = (safeCurvature / 100) * 0.8;
      const perpX = -centerToEndDy / centerToEndLength;
      const perpY = centerToEndDx / centerToEndLength;
      
      let flipMultiplier = curveFlipped ? -1 : 1;
      if (coordinateSystem === 'pdf') {
        flipMultiplier = -flipMultiplier;
      }
      
      // Control point for the ideal curve
      const idealCpX = idealStartX + centerToEndDx * 0.5 + perpX * centerToEndLength * curvatureMultiplier * flipMultiplier;
      const idealCpY = idealStartY + centerToEndDy * 0.5 + perpY * centerToEndLength * curvatureMultiplier * flipMultiplier;

      let lineEndX = actualEndX;
      let lineEndY = actualEndY;

      if (endType === 'arrow') {
        const tangentX = 2 * (actualEndX - idealCpX);
        const tangentY = 2 * (actualEndY - idealCpY);
        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
        
        if (tangentLength === 0) {
          arrowAngle = Math.atan2(centerToEndDy, centerToEndDx);
        } else {
          arrowAngle = Math.atan2(tangentY, tangentX);
        }
        
        lineEndX = actualEndX - endingSize * Math.cos(arrowAngle);
        lineEndY = actualEndY - endingSize * Math.sin(arrowAngle);
      }

      // Step 3: Generate the ideal curve and find where the visible line should start
      const segments = 50; // Higher resolution for better accuracy
      const idealCurve: RenderPoint[] = [];
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        const oneMinusT = 1 - t;
        const x = oneMinusT * oneMinusT * idealStartX + 
                  2 * oneMinusT * t * idealCpX + 
                  t * t * lineEndX;
        const y = oneMinusT * oneMinusT * idealStartY + 
                  2 * oneMinusT * t * idealCpY + 
                  t * t * lineEndY;
        
        idealCurve.push({ x, y });
      }
      
      // Step 4: Find the point on the ideal curve closest to our desired line start
      let bestIndex = 0;
      let bestDistance = Infinity;
      
      for (let i = 0; i < idealCurve.length; i++) {
        const point = idealCurve[i];
        const distance = Math.sqrt(
          (point.x - lineStartX) * (point.x - lineStartX) + 
          (point.y - lineStartY) * (point.y - lineStartY)
        );
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      
      // NEW: Create white initial segment if there's a straight portion
      if (bestIndex > 0) {
        // Add white segment from lineStart to the curve start point
        whitePathSegments.push({ x: lineStartX, y: lineStartY });
        whitePathSegments.push(idealCurve[bestIndex]);
      }
      
      // Step 5: Use only the portion of the ideal curve from the best point to the end
      for (let i = bestIndex; i < idealCurve.length; i++) {
        pathSegments.push(idealCurve[i]);
      }
      
      // Ensure we start exactly at the desired line start position for the curve
      if (pathSegments.length > 0 && bestIndex === 0) {
        pathSegments[0] = { x: lineStartX, y: lineStartY };
      }
    }
    
  } else {
    // S-curved line with same revolutionary approach
    const safeCurvature = Math.max(0, Math.min(100, curvature || 0));
    
    if (safeCurvature === 0) {
      // 0% curvature = straight line
      let lineEndX = actualEndX;
      let lineEndY = actualEndY;
      
      if (endType === 'arrow') {
        arrowAngle = Math.atan2(centerToEndDy, centerToEndDx);
        lineEndX = actualEndX - endingSize * Math.cos(arrowAngle);
        lineEndY = actualEndY - endingSize * Math.sin(arrowAngle);
      }
      
      pathSegments.push({ x: lineStartX, y: lineStartY });
      pathSegments.push({ x: lineEndX, y: lineEndY });
    } else {
      // BREAKTHROUGH: Same approach for S-curves
      
      const idealStartX = actualStartX;
      const idealStartY = actualStartY;
      
      const curvatureMultiplier = (safeCurvature / 100) * 0.6;
      const perpX = -centerToEndDy / centerToEndLength;
      const perpY = centerToEndDx / centerToEndLength;
      
      let finalCurvatureMultiplier = 1;
      if (coordinateSystem === 'pdf') {
        finalCurvatureMultiplier = -1;
      }
      if (curveFlipped) {
        finalCurvatureMultiplier = -finalCurvatureMultiplier;
      }
      
      // Control points for the ideal S-curve
      const idealCp1X = idealStartX + centerToEndDx * 0.33 + perpX * centerToEndLength * curvatureMultiplier * finalCurvatureMultiplier;
      const idealCp1Y = idealStartY + centerToEndDy * 0.33 + perpY * centerToEndLength * curvatureMultiplier * finalCurvatureMultiplier;
      const idealCp2X = idealStartX + centerToEndDx * 0.67 - perpX * centerToEndLength * curvatureMultiplier * finalCurvatureMultiplier;
      const idealCp2Y = idealStartY + centerToEndDy * 0.67 - perpY * centerToEndLength * curvatureMultiplier * finalCurvatureMultiplier;

      let lineEndX = actualEndX;
      let lineEndY = actualEndY;
      let adjustedCp2X = idealCp2X;
      let adjustedCp2Y = idealCp2Y;

      if (endType === 'arrow') {
        const tangentX = 3 * (actualEndX - idealCp2X);
        const tangentY = 3 * (actualEndY - idealCp2Y);
        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
        
        if (tangentLength === 0) {
          arrowAngle = Math.atan2(centerToEndDy, centerToEndDx);
        } else {
          arrowAngle = Math.atan2(tangentY, tangentX);
        }
        
        lineEndX = actualEndX - endingSize * Math.cos(arrowAngle);
        lineEndY = actualEndY - endingSize * Math.sin(arrowAngle);
        
        adjustedCp2X = idealStartX + (lineEndX - idealStartX) * 0.67 - perpX * centerToEndLength * curvatureMultiplier * finalCurvatureMultiplier;
        adjustedCp2Y = idealStartY + (lineEndY - idealStartY) * 0.67 - perpY * centerToEndLength * curvatureMultiplier * finalCurvatureMultiplier;
      }

      // Generate the ideal S-curve
      const segments = 60; // Higher resolution
      const idealCurve: RenderPoint[] = [];
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        const oneMinusT = 1 - t;
        const oneMinusTSquared = oneMinusT * oneMinusT;
        const oneMinusTCubed = oneMinusTSquared * oneMinusT;
        const tSquared = t * t;
        const tCubed = tSquared * t;
        
        const x = oneMinusTCubed * idealStartX + 
                  3 * oneMinusTSquared * t * idealCp1X + 
                  3 * oneMinusT * tSquared * adjustedCp2X + 
                  tCubed * lineEndX;
        const y = oneMinusTCubed * idealStartY + 
                  3 * oneMinusTSquared * t * idealCp1Y + 
                  3 * oneMinusT * tSquared * adjustedCp2Y + 
                  tCubed * lineEndY;
        
        idealCurve.push({ x, y });
      }
      
      // Find the best starting point on the ideal curve
      let bestIndex = 0;
      let bestDistance = Infinity;
      
      for (let i = 0; i < idealCurve.length; i++) {
        const point = idealCurve[i];
        const distance = Math.sqrt(
          (point.x - lineStartX) * (point.x - lineStartX) + 
          (point.y - lineStartY) * (point.y - lineStartY)
        );
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      
      // NEW: Create white initial segment if there's a straight portion
      if (bestIndex > 0) {
        // Add white segment from lineStart to the curve start point
        whitePathSegments.push({ x: lineStartX, y: lineStartY });
        whitePathSegments.push(idealCurve[bestIndex]);
      }
      
      // Use only the visible portion of the ideal curve
      for (let i = bestIndex; i < idealCurve.length; i++) {
        pathSegments.push(idealCurve[i]);
      }
      
      // Ensure we start exactly at the desired line start position for the curve
      if (pathSegments.length > 0 && bestIndex === 0) {
        pathSegments[0] = { x: lineStartX, y: lineStartY };
      }
    }
  }

  // Create rendered annotation object
  const result: RenderedAnnotation = {
    path: {
      segments: pathSegments,
      strokeWidth: 1.5,
      color: '#000000' // Black for main path
    },
    text: {
      text: number.toString(),
      position: { x: actualStartX, y: actualStartY },
      fontSize: numberSize,
      backgroundColor: textBackground
    }
  };

  // Add white path if we have initial straight segments
  if (whitePathSegments.length > 0) {
    result.whitePath = {
      segments: whitePathSegments,
      strokeWidth: 1.5,
      color: '#ffffff' // White for initial straight segment
    };
  }

  // Add arrow if needed
  if (endType === 'arrow') {
    const arrowWidth = endingSize * 0.5;
    
    const tipX = actualEndX;
    const tipY = actualEndY;
    
    const baseLeftX = actualEndX - endingSize * Math.cos(arrowAngle) - arrowWidth * Math.sin(arrowAngle);
    const baseLeftY = actualEndY - endingSize * Math.sin(arrowAngle) + arrowWidth * Math.cos(arrowAngle);
    
    const baseRightX = actualEndX - endingSize * Math.cos(arrowAngle) + arrowWidth * Math.sin(arrowAngle);
    const baseRightY = actualEndY - endingSize * Math.sin(arrowAngle) - arrowWidth * Math.cos(arrowAngle);

    result.arrow = {
      points: [
        { x: tipX, y: tipY },
        { x: baseLeftX, y: baseLeftY },
        { x: baseRightX, y: baseRightY }
      ],
      strokeWidth: 1.5
    };
  }

  // Add circle if needed
  if (endType === 'dot') {
    result.circle = {
      center: { x: actualEndX, y: actualEndY },
      radius: endingSize * 0.4
    };
  }

  return result;
};

const calculateTextBackground = (
  x: number, 
  y: number, 
  text: string, 
  fontSize: number
): RenderPoint[] => {
  const textWidth = text.length * (fontSize * 0.6);
  const textHeight = fontSize;
  const padding = Math.max(6, fontSize * 0.2);
  
  const rectX = x - textWidth/2 - padding;
  const rectY = y - textHeight/2 - padding/2;
  const rectWidth = textWidth + padding * 2;
  const rectHeight = textHeight + padding;
  
  return [
    { x: rectX, y: rectY },
    { x: rectX + rectWidth, y: rectY },
    { x: rectX + rectWidth, y: rectY + rectHeight },
    { x: rectX, y: rectY + rectHeight }
  ];
};