import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { Annotation } from '../types/annotation';
import { renderAnnotation } from './sharedRenderer';

export const savePDFWithAnnotations = async (
  originalFile: File,
  annotations: Annotation[],
  numberSize: number,
  endingSize: number,
  lineGap: number = 8 // NEW: Line gap parameter
): Promise<Blob> => {
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  // Group annotations by page
  const annotationsByPage = annotations.reduce((acc, annotation) => {
    if (!acc[annotation.page]) {
      acc[annotation.page] = [];
    }
    acc[annotation.page].push(annotation);
    return acc;
  }, {} as Record<number, Annotation[]>);

  // Add annotations to each page
  Object.entries(annotationsByPage).forEach(([pageNum, pageAnnotations]) => {
    const pageIndex = parseInt(pageNum) - 1;
    if (pageIndex >= 0 && pageIndex < pages.length) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      pageAnnotations.forEach((annotation) => {
        // Use SHARED RENDERER - PDF coordinate system with page height and line gap
        const rendered = renderAnnotation(
          annotation.startX,
          annotation.startY,
          annotation.endX,
          annotation.endY,
          annotation.lineType,
          annotation.endType,
          annotation.number,
          annotation.curvature || 50,
          annotation.curveFlipped || false,
          numberSize,
          endingSize,
          'pdf', // PDF coordinate system
          height, // Page height for coordinate conversion
          lineGap // NEW: Pass line gap to renderer
        );

        // Draw white path segments first (initial straight segment)
        if (rendered.whitePath) {
          for (let i = 0; i < rendered.whitePath.segments.length - 1; i++) {
            const start = rendered.whitePath.segments[i];
            const end = rendered.whitePath.segments[i + 1];
            
            page.drawLine({
              start: { x: start.x, y: start.y },
              end: { x: end.x, y: end.y },
              thickness: rendered.whitePath.strokeWidth,
              color: rgb(1, 1, 1), // White color
            });
          }
        }

        // Draw main path segments (curved portion)
        for (let i = 0; i < rendered.path.segments.length - 1; i++) {
          const start = rendered.path.segments[i];
          const end = rendered.path.segments[i + 1];
          
          page.drawLine({
            start: { x: start.x, y: start.y },
            end: { x: end.x, y: end.y },
            thickness: rendered.path.strokeWidth,
            color: rgb(0, 0, 0), // Black color
          });
        }

        // Draw arrow if present
        if (rendered.arrow) {
          const points = rendered.arrow.points;
          
          // Draw filled triangle by drawing multiple lines to create solid fill
          const fillSteps = Math.max(5, Math.floor(endingSize / 2));
          
          for (let i = 0; i <= fillSteps; i++) {
            const t = i / fillSteps;
            
            // Interpolate between left and right base points
            const leftX = points[1].x + t * (points[2].x - points[1].x);
            const leftY = points[1].y + t * (points[2].y - points[1].y);
            
            // Draw line from interpolated base point to tip
            page.drawLine({
              start: { x: leftX, y: leftY },
              end: { x: points[0].x, y: points[0].y },
              thickness: rendered.arrow.strokeWidth,
              color: rgb(0, 0, 0),
            });
          }
          
          // Draw outline for crisp edges
          page.drawLine({
            start: { x: points[0].x, y: points[0].y },
            end: { x: points[1].x, y: points[1].y },
            thickness: rendered.arrow.strokeWidth,
            color: rgb(0, 0, 0),
          });
          
          page.drawLine({
            start: { x: points[1].x, y: points[1].y },
            end: { x: points[2].x, y: points[2].y },
            thickness: rendered.arrow.strokeWidth,
            color: rgb(0, 0, 0),
          });
          
          page.drawLine({
            start: { x: points[2].x, y: points[2].y },
            end: { x: points[0].x, y: points[0].y },
            thickness: rendered.arrow.strokeWidth,
            color: rgb(0, 0, 0),
          });
        }

        // Draw circle if present
        if (rendered.circle) {
          page.drawCircle({
            x: rendered.circle.center.x,
            y: rendered.circle.center.y,
            size: rendered.circle.radius,
            color: rgb(0, 0, 0),
          });
        }
        
        // Draw text background
        const bgPoints = rendered.text.backgroundColor;
        page.drawRectangle({
          x: bgPoints[0].x,
          y: bgPoints[0].y,
          width: bgPoints[1].x - bgPoints[0].x,
          height: bgPoints[2].y - bgPoints[1].y,
          color: rgb(1, 1, 1),
        });
        
        // Draw text
        page.drawText(rendered.text.text, {
          x: rendered.text.position.x - (rendered.text.text.length * (rendered.text.fontSize * 0.6)) / 2,
          y: rendered.text.position.y - rendered.text.fontSize / 3,
          size: rendered.text.fontSize,
          color: rgb(0, 0, 0),
        });
      });
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};