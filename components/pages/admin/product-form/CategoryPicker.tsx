'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryPickerProps {
  value: string;
  categories?: string[];
  onChange: (value: string) => void;
  error?: string;
  onErrorClear?: () => void;
}

export function CategoryPicker({ value, categories, onChange, error, onErrorClear }: CategoryPickerProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium leading-none">Category *</span>
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={(v) => {
            onChange(v);
            onErrorClear?.();
          }}
        >
          <SelectTrigger className={error ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Or new category"
          value={!categories?.includes(value) ? value : ''}
          onChange={(e) => {
            onChange(e.target.value);
            onErrorClear?.();
          }}
          className="flex-1"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
