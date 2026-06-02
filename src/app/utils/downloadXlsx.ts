import * as XLSX from 'xlsx';

/** Descarga un libro Excel; funciona mejor en Safari/iOS que `XLSX.writeFile`. */
export function downloadXlsxWorkbook(
  workbook: XLSX.WorkBook,
  filename: string
): void {
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
