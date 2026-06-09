import { jsPDF } from 'jspdf';
import { Novedad, NovedadTipo, NovedadTurno } from '../types';

const TIPO_LABELS: Record<NovedadTipo, string> = {
  incidente: 'Incidente',
  mantenimiento: 'Mantenimiento',
  paquete: 'Paquete / Encomienda',
  emergencia: 'Emergencia',
  acceso: 'Acceso',
  otro: 'Otro',
};

const TURNO_LABELS: Record<NovedadTurno, string> = {
  dia: 'Dia',
  noche: 'Noche',
};

const TURNO_EMOJI: Record<NovedadTurno, string> = {
  dia: '☀️',
  noche: '🌙',
};

/** e.g. 07/jun/2026 */
function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** e.g. 22:30 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────
// Plain-text report (for copy/paste in WhatsApp)
// ─────────────────────────────────────────────

export function buildNovedadText(novedad: Novedad): string {
  const fecha = formatDateShort(novedad.createdAt);
  const hora = formatTime(novedad.createdAt);
  const turnoLabel = `${TURNO_EMOJI[novedad.turno]} ${TURNO_LABELS[novedad.turno]}`;
  const tipoLabel = TIPO_LABELS[novedad.tipo];
  const puesto = novedad.locationName ?? '—';

  const lines = [
    '⚠️ REPORTE DE NOVEDAD',
    '————————————————',
    `🏢 Puesto: ${puesto}`,
    `👮 Guardia: ${novedad.guardName}`,
    `🕐 Turno: ${turnoLabel}`,
    `📅 Fecha: ${fecha}   🕑 Hora: ${hora}`,
    '━━━━━━━━━━━━━━━',
    `📌 Tipo de Novedad: ${tipoLabel}`,
  ];

  if (novedad.ubicacion) lines.push(`📍 Ubicacion: ${novedad.ubicacion}`);

  lines.push('━━━━━━━━━━━━━━━');
  lines.push('📝 Descripcion:');
  lines.push(novedad.descripcion);

  if (novedad.medidasTomadas) {
    lines.push('✅ Medidas tomadas:');
    lines.push(novedad.medidasTomadas);
  }

  lines.push('');
  lines.push('————————————————');
  lines.push('Generado por SEVIGPRO');

  return lines.join('\n');
}

export function downloadNovedadTxt(novedad: Novedad): void {
  const text = buildNovedadText(novedad);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const d = new Date(novedad.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = `novedad_${stamp}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// PDF report
// ─────────────────────────────────────────────

const PAGE_W = 210;   // A4 mm
const MARGIN  = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Brand colours (RGB)
const BLUE  = [30, 64, 175]  as const;  // blue-800
const LBLUE = [219, 234, 254] as const; // blue-100
const GRAY  = [75, 85, 99]   as const;  // gray-600
const DGRAY = [17, 24, 39]   as const;  // gray-900
const GREEN = [22, 101, 52]  as const;  // green-800
const LGREEN= [220, 252, 231] as const; // green-100
const WHITE = [255, 255, 255] as const;

function setColor(
  doc: jsPDF,
  target: 'fill' | 'text' | 'draw',
  rgb: readonly [number, number, number]
) {
  if (target === 'fill') doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  else if (target === 'text') doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  else doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

/** Draws a filled pill/rect badge. Returns the badge right-edge x. */
function badge(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  bg: readonly [number, number, number],
  fg: readonly [number, number, number]
): number {
  const pad = 3;
  doc.setFontSize(8);
  const tw = doc.getTextWidth(text);
  const bw = tw + pad * 2;
  const bh = 5.5;
  setColor(doc, 'fill', bg);
  doc.roundedRect(x, y - 4, bw, bh, 1, 1, 'F');
  setColor(doc, 'text', fg);
  doc.text(text, x + pad, y);
  return x + bw;
}

/** Wraps text and returns the new Y position after printing. */
function wrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
): number {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

/** Draws a labelled section block. */
function section(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number
): number {
  const LINE_H = 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'text', GRAY);
  doc.text(label.toUpperCase(), x, y);
  y += 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, 'text', DGRAY);
  y = wrappedText(doc, value, x, y, maxW, LINE_H);
  return y + 2;
}

/** Horizontal divider line */
function divider(doc: jsPDF, y: number): number {
  setColor(doc, 'draw', [229, 231, 235]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 5;
}

/** Returns [width, height, format] of a data-URL image capped to maxW / maxH */
function fitImage(
  dataUrl: string,
  maxW: number,
  maxH: number
): Promise<{ w: number; h: number; fmt: 'JPEG' | 'PNG' }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      resolve({ w, h, fmt });
    };
    img.src = dataUrl;
  });
}

export async function downloadNovedadPdf(novedad: Novedad): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const fecha = formatDateShort(novedad.createdAt);
  const hora  = formatTime(novedad.createdAt);
  const puesto = novedad.locationName ?? 'Sin asignar';
  let y = 0;

  // ── Header banner ──────────────────────────────────────────
  setColor(doc, 'fill', BLUE);
  doc.rect(0, 0, PAGE_W, 22, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'text', WHITE);
  doc.text('REPORTE DE NOVEDAD', MARGIN, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SEVIGPRO — Sistema de Seguridad', MARGIN, 16);

  // tipo badge (top-right)
  const tipoLabel = TIPO_LABELS[novedad.tipo].toUpperCase();
  const badgeX = PAGE_W - MARGIN - doc.getTextWidth(tipoLabel) - 8;
  badge(doc, tipoLabel, badgeX, 13, LBLUE, BLUE);

  y = 28;

  // ── Info grid ──────────────────────────────────────────────
  // Two columns: left (puesto, guardia, turno) | right (fecha/hora)
  const COL1 = MARGIN;
  const COL2 = PAGE_W / 2 + 4;
  const COL_W = PAGE_W / 2 - MARGIN - 2;

  // Left
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'text', GRAY);
  doc.text('PUESTO', COL1, y);
  doc.text('GUARDIA', COL1, y + 9);
  doc.text('TURNO', COL1, y + 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, 'text', DGRAY);
  doc.text(puesto, COL1, y + 4);
  doc.text(novedad.guardName, COL1, y + 13);
  doc.text(`${TURNO_LABELS[novedad.turno]}`, COL1, y + 22);

  // Right
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  setColor(doc, 'text', GRAY);
  doc.text('FECHA', COL2, y);
  doc.text('HORA', COL2, y + 9);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, 'text', DGRAY);
  doc.text(fecha, COL2, y + 4);
  doc.text(hora, COL2, y + 13);

  y += 28;
  y = divider(doc, y);

  // ── Tipo + Ubicación ───────────────────────────────────────
  if (novedad.ubicacion) {
    const half = CONTENT_W / 2 - 3;
    y = section(doc, 'Tipo de Novedad', TIPO_LABELS[novedad.tipo], COL1, y, half);
    const savedY = y;
    section(doc, 'Ubicacion', novedad.ubicacion, COL2, y - (savedY - (y - 6)), half);
  } else {
    y = section(doc, 'Tipo de Novedad', TIPO_LABELS[novedad.tipo], COL1, y, CONTENT_W);
  }

  y = divider(doc, y);

  // ── Descripción ────────────────────────────────────────────
  y = section(doc, 'Descripcion', novedad.descripcion, MARGIN, y, CONTENT_W);

  // ── Medidas tomadas ────────────────────────────────────────
  if (novedad.medidasTomadas) {
    // light green pill header
    setColor(doc, 'fill', LGREEN);
    doc.roundedRect(MARGIN, y - 1, CONTENT_W, 6, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setColor(doc, 'text', GREEN);
    doc.text('MEDIDAS TOMADAS', MARGIN + 2, y + 3.5);
    y += 9;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(doc, 'text', DGRAY);
    y = wrappedText(doc, novedad.medidasTomadas, MARGIN, y, CONTENT_W, 5);
    y += 4;
  }

  // ── Photos ─────────────────────────────────────────────────
  if (novedad.photoUrls.length > 0) {
    y = divider(doc, y);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setColor(doc, 'text', GRAY);
    doc.text('EVIDENCIA FOTOGRAFICA', MARGIN, y);
    y += 4;

    const maxImgW = CONTENT_W;
    const maxImgH = 80;

    for (let i = 0; i < novedad.photoUrls.length; i++) {
      const photoUrl = novedad.photoUrls[i];

      if (novedad.photoUrls.length > 1) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        setColor(doc, 'text', GRAY);
        doc.text(`Foto ${i + 1}`, MARGIN, y);
        y += 3;
      }

      try {
        const { w, h, fmt } = await fitImage(photoUrl, maxImgW, maxImgH);

        if (y + h + 6 > 280) {
          doc.addPage();
          y = 16;
        }

        doc.addImage(photoUrl, fmt, MARGIN, y, w, h);
        y += h + 6;
      } catch {
        doc.setFontSize(9);
        setColor(doc, 'text', GRAY);
        doc.text('[No se pudo cargar la imagen]', MARGIN, y + 4);
        y += 10;
      }
    }
  }

  // ── Footer ─────────────────────────────────────────────────
  const PAGE_H = doc.internal.pageSize.getHeight();
  setColor(doc, 'fill', [249, 250, 251]);
  doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(doc, 'text', GRAY);
  doc.text(
    `Generado por SEVIGPRO  |  ${fecha}  ${hora}`,
    MARGIN,
    PAGE_H - 4
  );

  // ── Save ───────────────────────────────────────────────────
  const d = new Date(novedad.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  doc.save(`novedad_${stamp}.pdf`);
}
