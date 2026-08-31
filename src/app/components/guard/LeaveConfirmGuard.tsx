import { useEffect } from 'react';
import { useBlocker } from 'react-router';

type LeaveConfirmGuardProps = {
  active: boolean;
  title: string;
  message: string;
};

export default function LeaveConfirmGuard({ active, title, message }: LeaveConfirmGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      active && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);

  if (blocker.state !== 'blocked') return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">{message}</p>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={() => blocker.reset?.()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => blocker.proceed?.()}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
