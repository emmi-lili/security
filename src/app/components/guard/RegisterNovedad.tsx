import React, { useState, useRef } from 'react';
import { FileText, CheckCircle, Download, RotateCcw, Camera, ImageIcon, X, Loader2, Sparkles } from 'lucide-react';
import { correctSpelling } from '../../utils/spellCheck';
import { useApp } from '../../contexts/AppContext';
import { Novedad, NovedadTipo, NovedadTurno } from '../../types';
import { downloadNovedadTxt, downloadNovedadPdf, buildNovedadText } from '../../utils/exportNovedad';
import { fileToCompressedDataUrl } from '../../utils/compressImage';

function normalizeText(raw: string): string {
  let text = raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1');
  if (!text) return text;
  text = text.replace(/(^|[.!?]\s+)([a-záéíóúüñ])/gi, (_, sep, letter) =>
    sep + letter.toUpperCase()
  );
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

const TIPO_OPTIONS: { value: NovedadTipo; label: string }[] = [
  { value: 'incidente',     label: 'Incidente' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'paquete',       label: 'Paquete / Encomienda' },
  { value: 'emergencia',    label: 'Emergencia' },
  { value: 'acceso',        label: 'Acceso' },
  { value: 'otro',          label: 'Otro' },
];

type Step = 'form' | 'preview';

export default function RegisterNovedad() {
  const { currentUser, addNovedad, locations } = useApp();

  const assignedLocation = locations.find(
    (l) => currentUser && l.guardIds.includes(currentUser.id)
  );

  const [step, setStep] = useState<Step>('form');
  const [savedNovedad, setSavedNovedad] = useState<Novedad | null>(null);

  const [guardName, setGuardName]         = useState('');
  const [turno, setTurno]                 = useState<NovedadTurno>('dia');
  const [tipo, setTipo]                   = useState<NovedadTipo | ''>('');
  const [ubicacion, setUbicacion]         = useState('');
  const [descripcion, setDescripcion]     = useState('');
  const [medidas, setMedidas]             = useState('');

  const [photoDataUrls, setPhotoDataUrls]   = useState<string[]>([]);
  const [photoLoading, setPhotoLoading]     = useState(false);
  const [correctingDesc, setCorrectingDesc] = useState(false);
  const [correctingMed, setCorrectingMed]   = useState(false);
  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isValid = guardName.trim() && tipo && descripcion.trim();

  const processPhotoFile = async (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return;
    setPhotoLoading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPhotoDataUrls((prev) => [...prev, dataUrl]);
    } catch {
      window.alert('No se pudo usar esa imagen. Intenta otra foto.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoDataUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const novedad: Novedad = {
      id: `nov-${Date.now()}`,
      guardName: guardName.trim(),
      turno,
      tipo: tipo as NovedadTipo,
      ubicacion: ubicacion.trim(),
      descripcion: normalizeText(descripcion),
      medidasTomadas: medidas.trim() ? normalizeText(medidas) : '',
      photoUrls: photoDataUrls,
      createdAt: new Date().toISOString(),
      guardId: currentUser?.id ?? '',
      locationId: assignedLocation?.id,
      locationName: assignedLocation?.name,
    };

    addNovedad(novedad);
    setSavedNovedad(novedad);
    setStep('preview');
  };

  const handleReset = () => {
    setStep('form');
    setSavedNovedad(null);
    setGuardName('');
    setTurno('dia');
    setTipo('');
    setUbicacion('');
    setDescripcion('');
    setMedidas('');
    setPhotoDataUrls([]);
  };

  if (step === 'preview' && savedNovedad) {
    return <PreviewStep novedad={savedNovedad} onReset={handleReset} />;
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 bg-white';
  const labelCls = 'block text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2';

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Novedad</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete el formulario y genere el informe para WhatsApp
        </p>
        {assignedLocation && (
          <p className="text-xs text-blue-600 font-medium mt-1">
            🏢 {assignedLocation.name}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Guardia + Turno */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre del Guardia</label>
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              placeholder="Nombre completo"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Turno</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value as NovedadTurno)}
              className={inputCls + ' appearance-none'}
            >
              <option value="dia">☀️ Día</option>
              <option value="noche">🌙 Noche</option>
            </select>
          </div>
        </div>

        {/* Tipo de Novedad */}
        <div>
          <label className={labelCls}>Tipo de Novedad</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as NovedadTipo | '')}
            className={inputCls + ' appearance-none'}
          >
            <option value="">Selecciona un tipo…</option>
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ubicación dentro del puesto */}
        <div>
          <label className={labelCls}>Ubicación</label>
          <input
            type="text"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Ej: Estacionamiento, Lobby, Torre A…"
            className={inputCls}
          />
        </div>

        <hr className="border-gray-100" />

        {/* Descripción */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              Descripción de la Novedad
            </label>
            {correctingDesc && (
              <span className="flex items-center gap-1 text-xs text-purple-500">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Corrigiendo…
              </span>
            )}
          </div>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={async () => {
              if (!descripcion.trim()) return;
              setCorrectingDesc(true);
              const fixed = normalizeText(await correctSpelling(descripcion));
              setDescripcion(fixed);
              setCorrectingDesc(false);
            }}
            placeholder="Describe detalladamente lo ocurrido…"
            rows={4}
            spellCheck
            autoCorrect="on"
            autoCapitalize="sentences"
            className={inputCls + ' resize-none'}
          />
        </div>

        {/* Medidas Tomadas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}>
              Medidas Tomadas{' '}
              <span className="font-normal text-gray-400 normal-case">(opcional)</span>
            </label>
            {correctingMed && (
              <span className="flex items-center gap-1 text-xs text-purple-500">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Corrigiendo…
              </span>
            )}
          </div>
          <textarea
            value={medidas}
            onChange={(e) => setMedidas(e.target.value)}
            onBlur={async () => {
              if (!medidas.trim()) return;
              setCorrectingMed(true);
              const fixed = normalizeText(await correctSpelling(medidas));
              setMedidas(fixed);
              setCorrectingMed(false);
            }}
            placeholder="Ej: Informé al supervisor, solicité ayuda, tomé nota de involucrados…"
            rows={3}
            spellCheck
            autoCorrect="on"
            autoCapitalize="sentences"
            className={inputCls + ' resize-none'}
          />
        </div>

        {/* Fotos adjuntas */}
        <div>
          <label className={labelCls}>
            Fotos adjuntas{' '}
            <span className="font-normal text-gray-400 normal-case">(opcional)</span>
          </label>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
            className="sr-only" aria-hidden
            onChange={(e) => { void processPhotoFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          <input ref={galleryInputRef} type="file" accept="image/*"
            className="sr-only" aria-hidden
            onChange={(e) => { void processPhotoFile(e.target.files?.[0]); e.target.value = ''; }}
          />

          {photoDataUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              {photoDataUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Evidencia ${index + 1}`}
                    className="w-full h-32 rounded-xl object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              disabled={photoLoading}
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Camera className="w-7 h-7 text-blue-500" />
              <span className="text-gray-800 font-medium text-sm">
                {photoLoading
                  ? 'Procesando…'
                  : photoDataUrls.length > 0
                    ? 'Agregar otra foto con cámara'
                    : 'Abrir cámara'}
              </span>
            </button>
            <button
              type="button"
              disabled={photoLoading}
              onClick={() => galleryInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-50"
            >
              <ImageIcon className="w-5 h-5" />
              {photoDataUrls.length > 0 ? 'Agregar de fototeca' : 'Elegir de fototeca'}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Generar informe para WhatsApp
        </button>
      </form>
    </div>
  );
}

function PreviewStep({ novedad, onReset }: { novedad: Novedad; onReset: () => void }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const text = buildNovedadText(novedad);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await downloadNovedadPdf(novedad);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Success banner */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-6">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Novedad registrada</p>
          <p className="text-xs text-green-600">
            {novedad.photoUrls.length > 0
              ? `Incluye ${novedad.photoUrls.length} foto${novedad.photoUrls.length > 1 ? 's' : ''} adjunta${novedad.photoUrls.length > 1 ? 's' : ''}. `
              : ''}Descarga el PDF con el informe completo
          </p>
        </div>
      </div>

      {/* Photo preview */}
      {novedad.photoUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {novedad.photoUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Evidencia adjunta ${index + 1}`}
              className="w-full h-32 rounded-xl object-cover border border-gray-200"
            />
          ))}
        </div>
      )}

      {/* WhatsApp text preview */}
      <textarea
        id="novedad-preview"
        readOnly
        value={text}
        rows={16}
        className="w-full font-mono text-xs border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
      />

      <div className="flex flex-col gap-3">
        {/* PRIMARY — PDF */}
        <button
          onClick={handlePdf}
          disabled={pdfLoading}
          className="w-full py-4 rounded-2xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white flex items-center justify-center gap-2 transition-colors"
        >
          {pdfLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Generando PDF…</>
          ) : (
            <><Download className="w-5 h-5" />Descargar PDF</>
          )}
        </button>

        {/* SECONDARY — txt download */}
        <button
          onClick={() => downloadNovedadTxt(novedad)}
          className="w-full py-2.5 rounded-2xl text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar .txt
        </button>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-2xl text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Registrar otra novedad
        </button>
      </div>
    </div>
  );
}
