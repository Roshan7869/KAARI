import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { COURIER_OPTIONS, type CourierKey } from './types';

interface CourierSelectorProps {
  value: CourierKey;
  onChange: (key: CourierKey) => void;
  otherLabel: string;
  onOtherLabelChange: (val: string) => void;
}

export function CourierSelector({
  value,
  onChange,
  otherLabel,
  onOtherLabelChange,
}: CourierSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl" id="courier-title">Delivery Provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="font-body text-sm font-medium block">Select delivery provider</label>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          role="group"
          aria-labelledby="courier-title"
        >
          {COURIER_OPTIONS.map(opt => (
            <label
              key={opt.key}
              className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                value === opt.key
                  ? 'border-amber-700 bg-amber-50'
                  : 'border-input hover:border-amber-700/40'
              }`}
            >
              <input
                type="radio"
                name="courier"
                value={opt.key}
                checked={value === opt.key}
                onChange={() => onChange(opt.key)}
                className="mt-0.5 accent-amber-700"
                aria-label={`${opt.label} - estimated delivery ${opt.eta}`}
              />
              <span className="text-lg flex-shrink-0" aria-hidden="true">{opt.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium font-body truncate">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">Est. {opt.eta}</span>
              </span>
              {opt.badge && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${
                  value === opt.key
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {opt.badge}
                </span>
              )}
            </label>
          ))}
        </div>

        {value === 'OTHER' && (
          <div>
            <label htmlFor="courier-name" className="font-body text-sm font-medium block mb-1">Courier name</label>
            <Input
              id="courier-name"
              type="text"
              placeholder="Enter courier / delivery service name"
              value={otherLabel}
              onChange={e => onOtherLabelChange(e.target.value)}
              className="mt-1"
              required={value === 'OTHER'}
              aria-label="Custom courier or delivery service name"
              aria-required={value === 'OTHER'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
