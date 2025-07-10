export interface CSVReference {
  id: string;
  number: string;
  description: string;
}

export interface CSVData {
  filename: string;
  references: CSVReference[];
  uploadDate: Date;
}