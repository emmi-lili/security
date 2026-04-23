import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertCircle, Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error';

const SCANNER_ELEMENT_ID = 'guard-qr-scanner-region';

// Only retry with a different camera selection for constraint / device errors.
// Never retry on permission errors — the user explicitly denied access.
function isRecoverable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('notallowed') || msg.includes('permission') || msg.includes('denied')) {
    return false;
  }
  return (
    msg.includes('overconstrained') ||
    msg.includes('constraint') ||
    msg.includes('notreadable') ||
    msg.includes('notfound') ||
    msg.includes('facingmode')
  );
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const [permission, setPermission] = useState<PermissionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const start = async () => {
      setPermission('requesting');

      if (!navigator.mediaDevices?.getUserMedia) {
        setPermission('unavailable');
        setErrorMsg(
          'Tu navegador no soporta acceso a la cámara. Abre la app en Chrome (Android) o Safari (iOS) sobre HTTPS.'
        );
        return;
      }

      const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.7);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      const onDecoded = (decodedText: string) => {
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;
        onScan(decodedText);
      };

      // Try rear camera first (mobile), then front, then any available camera.
      // html5-qrcode requires facingMode as a plain string or { exact: ... },
      // it rejects MediaTrackConstraints helpers like { ideal: ... }.
      const tryStart = async () => {
        try {
          await html5Qrcode.start({ facingMode: 'environment' }, config, onDecoded, undefined);
          return;
        } catch (e1) {
          if (!isRecoverable(e1)) throw e1;
        }
        try {
          await html5Qrcode.start({ facingMode: 'user' }, config, onDecoded, undefined);
          return;
        } catch (e2) {
          if (!isRecoverable(e2)) throw e2;
        }
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error('NotFoundError: no cameras available');
        }
        await html5Qrcode.start(cameras[0].id, config, onDecoded, undefined);
      };

      try {
        await tryStart();
        if (isMounted) setPermission('granted');
      } catch (err: unknown) {
        if (!isMounted) return;

        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();

        if (
          lower.includes('notallowed') ||
          lower.includes('permission') ||
          lower.includes('denied')
        ) {
          setPermission('denied');
          setErrorMsg(
            'Permiso de cámara denegado. Habilítalo desde los ajustes del navegador (candado en la barra de direcciones → Permisos → Cámara) y vuelve a intentarlo.'
          );
        } else if (lower.includes('notfound') || lower.includes('no camera')) {
          setPermission('unavailable');
          setErrorMsg('No se detectó ninguna cámara en este dispositivo.');
        } else if (lower.includes('secure') || lower.includes('https')) {
          setPermission('error');
          setErrorMsg(
            'La cámara requiere HTTPS. Accede a la app mediante una URL segura (https://) o localhost.'
          );
        } else {
          setPermission('error');
          setErrorMsg(`No se pudo iniciar la cámara: ${message}`);
        }
      }
    };

    start();

    return () => {
      isMounted = false;
      const instance = scannerRef.current;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  const showError =
    permission === 'denied' || permission === 'unavailable' || permission === 'error';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <span className="font-medium">Escanear QR</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg"
          aria-label="Cerrar escáner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <div
          id={SCANNER_ELEMENT_ID}
          className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />

        {permission === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 pointer-events-none">
            <Camera className="w-16 h-16 mb-4 animate-pulse" />
            <p className="font-medium">Solicitando acceso a la cámara…</p>
            <p className="text-sm text-gray-300 mt-1">
              Acepta el permiso en tu navegador para continuar.
            </p>
          </div>
        )}

        {permission === 'granted' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-4 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}

        {showError && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-xl">
              <div className="bg-red-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Cámara no disponible
              </h4>
              <p className="text-sm text-gray-600 mb-5">{errorMsg}</p>
              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {permission === 'granted' && (
        <div className="p-4 bg-gray-900 text-center text-sm text-gray-300">
          Apunta la cámara al código QR del punto de control
        </div>
      )}
    </div>
  );
}
