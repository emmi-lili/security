import { Calendar, X } from 'lucide-react';

type Props = {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  className?: string;
};

/**
 * Reusable "Desde / Hasta" date-range filter for report screens.
 * Values are `YYYY-MM-DD` strings; an empty value means open-ended.
 */
export default function DateRangeFilter({ from, to, onChange, className }: Props) {
  const hasRange = from !== '' || to !== '';

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className ?? ''}`}>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Desde
        </label>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Hasta
        </label>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {hasRange && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          title="Limpiar rango de fechas"
        >
          <X className="w-4 h-4" />
          Limpiar
        </button>
      )}
    </div>
  );
}
