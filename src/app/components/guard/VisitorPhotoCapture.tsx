import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, ImageIcon, X } from 'lucide-react';
import { fileToCompressedDataUrl, videoFrameToDataUrl } from '../../utils/compressImage';

interface VisitorPhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

type Mode = 'loading' | 'live' | 'file-only' | 'error';

export default function VisitorPhotoCapture({
  onCapture,
  onClose,
}: VisitorPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMode('file-only');
        return;
      }

      const tryFacing = async (facingMode: 'user' | 'environment') => {
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      };

      try {
        let stream: MediaStream;
        try {
          stream = await tryFacing('user');
        } catch {
          stream = await tryFacing('environment');
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setMode('live');
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Usa «Tomar foto» o «Galería» para elegir una imagen.'
            : 'No se pudo abrir la cámara en vivo. Usa los botones de abajo.';
        setErrorMsg(msg);
        setMode('file-only');
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream]);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setCapturing(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      stopStream();
      onCapture(dataUrl);
    } catch {
      setErrorMsg('No se pudo procesar la imagen. Intenta otra foto.');
      setMode('error');
    } finally {
      setCapturing(false);
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    setCapturing(true);
    try {
      const dataUrl = videoFrameToDataUrl(video);
      stopStream();
      onCapture(dataUrl);
    } catch {
      setErrorMsg('Error al capturar. Intenta de nuevo.');
      setMode('error');
    } finally {
      setCapturing(false);
    }
  };

  const openCameraPicker = () => {
    fileInputRef.current?.click();
  };

  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <div className="flex items-center justify-between p-4 text-white">
        <span className="font-medium">Foto del visitante</span>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        {mode === 'live' && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {(mode === 'file-only' || mode === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
            {mode === 'error' ? (
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            ) : (
              <Camera className="w-12 h-12 text-gray-400 mb-3" />
            )}
            <p className="text-sm text-gray-300 max-w-sm">
              {errorMsg ||
                'Selecciona una foto con la cámara del teléfono o desde la galería.'}
            </p>
          </div>
        )}

        {mode === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Camera className="w-12 h-12 animate-pulse" />
          </div>
        )}
      </div>

      <div className="bg-white p-4 space-y-2 safe-area-pb">
        {mode === 'live' && (
          <button
            type="button"
            onClick={handleCaptureFrame}
            disabled={capturing}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold disabled:opacity-60"
          >
            {capturing ? 'Guardando…' : 'Capturar foto'}
          </button>
        )}
        <button
          type="button"
          onClick={openCameraPicker}
          disabled={capturing}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
        >
          <Camera className="w-5 h-5" />
          {mode === 'live' ? 'O usar cámara del sistema' : 'Tomar foto'}
        </button>
        <button
          type="button"
          onClick={openGallery}
          disabled={capturing}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-900 py-3 rounded-lg font-medium disabled:opacity-60"
        >
          <ImageIcon className="w-5 h-5" />
          Elegir de galería
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="w-full bg-gray-200 text-gray-900 py-3 rounded-lg font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
