import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText, AlertCircle } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFThumbnailProps {
  projectId: string;
  fileName: string;
  getPDFFromStorage: (projectId: string) => Promise<File | null>;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({
  projectId,
  fileName,
  getPDFFromStorage
}) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        const file = await getPDFFromStorage(projectId);
        if (file) {
          setPdfFile(file);
        } else {
          setError('PDF not found');
        }
      } catch (err) {
        console.error('Failed to load PDF for thumbnail:', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [projectId, getPDFFromStorage]);

  const onDocumentLoadSuccess = () => {
    // Document loaded successfully
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF document load error:', error);
    setError('Failed to load PDF');
    setLoading(false);
  };

  const onPageLoadSuccess = () => {
    setPageLoaded(true);
    setLoading(false);
  };

  const onPageLoadError = (error: Error) => {
    console.error('PDF page load error:', error);
    setError('Failed to render page');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="w-32 h-40 bg-gray-100 rounded border flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !pdfFile) {
    return (
      <div className="w-32 h-40 bg-gray-100 rounded border flex flex-col items-center justify-center">
        <AlertCircle size={24} className="text-gray-400 mb-2" />
        <span className="text-sm text-gray-400 text-center px-2">
          {error === 'PDF not found' ? 'Not found' : 'Error'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-32 h-40 bg-white rounded border shadow-sm overflow-hidden relative group">
      {/* Loading overlay */}
      {!pageLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* PDF Document */}
      <Document
        file={pdfFile}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        className="w-full h-full"
      >
        <Page
          pageNumber={1}
          width={128} // Doubled from 64 to 128
          onLoadSuccess={onPageLoadSuccess}
          onLoadError={onPageLoadError}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          className="w-full h-full"
        />
      </Document>

      {/* Hover overlay with filename */}
      <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2">
        <div className="text-white text-sm text-center">
          <FileText size={16} className="mx-auto mb-2" />
          <div className="truncate max-w-full" title={fileName}>
            {fileName.length > 16 ? `${fileName.substring(0, 13)}...` : fileName}
          </div>
        </div>
      </div>
    </div>
  );
};