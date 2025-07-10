import { useState, useCallback } from 'react';
import { CSVData, CSVReference } from '../types/csv';
import * as XLSX from 'xlsx';

export const useCSVData = () => {
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((content: string): CSVReference[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const references: CSVReference[] = [];

    // Skip header row if it exists
    const startIndex = lines[0]?.toLowerCase().includes('number') || lines[0]?.toLowerCase().includes('description') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle quoted values)
      const columns = parseCSVLine(line);
      
      if (columns.length >= 2) {
        const number = columns[0].trim();
        const description = columns[1].trim();
        
        if (number && description) {
          references.push({
            id: `ref_${Date.now()}_${i}`,
            number,
            description
          });
        }
      }
    }

    return references;
  }, []);

  const parseXLSX = useCallback((arrayBuffer: ArrayBuffer): CSVReference[] => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const references: CSVReference[] = [];
      
      // Skip header row if it exists
      const startIndex = jsonData[0] && (
        String(jsonData[0][0]).toLowerCase().includes('number') || 
        String(jsonData[0][1]).toLowerCase().includes('description')
      ) ? 1 : 0;

      for (let i = startIndex; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;

        const number = String(row[0] || '').trim();
        const description = String(row[1] || '').trim();
        
        if (number && description) {
          references.push({
            id: `ref_${Date.now()}_${i}`,
            number,
            description
          });
        }
      }

      return references;
    } catch (error) {
      throw new Error('Failed to parse Excel file. Please ensure it has two columns: Number and Description.');
    }
  }, []);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || 
                     file.name.toLowerCase().endsWith('.xls') ||
                     file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel';

      let references: CSVReference[];

      if (isExcel) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        references = parseXLSX(arrayBuffer);
      } else {
        // Parse CSV file
        const content = await file.text();
        references = parseCSV(content);
      }

      if (references.length === 0) {
        throw new Error('No valid data found. Please ensure your file has two columns: numbers and descriptions.');
      }

      const newCSVData: CSVData = {
        filename: file.name,
        references,
        uploadDate: new Date()
      };

      setCSVData(newCSVData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, [parseCSV, parseXLSX]);

  const clearCSVData = useCallback(() => {
    setCSVData(null);
    setError(null);
  }, []);

  return {
    csvData,
    isLoading,
    error,
    loadCSVFile: loadFile, // Renamed to be more generic
    clearCSVData
  };
};