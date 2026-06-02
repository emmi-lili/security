import * as XLSX from 'xlsx';
import { downloadXlsxWorkbook } from './downloadXlsx';

export function exportRowsToXlsx(
  sheetName: string,
  headers: readonly string[],
  rows: (string | number)[][],
  filename: string
): void {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((row) => String(row[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  sheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));

  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  downloadXlsxWorkbook(workbook, name);
}
