declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface AutoTableOptions {
    head?: any[][];
    body?: any[][];
    startY?: number;
    theme?: 'striped' | 'grid' | 'plain';
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
    columnStyles?: any;
    margin?: any;
    didDrawPage?: (data: any) => void;
  }
  
  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  
  export default autoTable;
}
