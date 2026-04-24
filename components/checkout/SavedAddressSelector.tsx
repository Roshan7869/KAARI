import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SavedAddress } from './types';

interface SavedAddressSelectorProps {
  addresses: SavedAddress[];
  selectedId: string;
  loading: boolean;
  saveChecked: boolean;
  onSelect: (id: string) => void;
  onSaveToggle: (checked: boolean) => void;
}

export function SavedAddressSelector({
  addresses,
  selectedId,
  loading,
  saveChecked,
  onSelect,
  onSaveToggle,
}: SavedAddressSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Saved Addresses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="font-body text-sm font-medium">Choose saved address</label>
        <select
          className="w-full border border-input bg-background px-3 py-2 rounded-sm font-body text-sm"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading || addresses.length === 0}
          aria-label="Select saved address or enter new address"
        >
          <option value="">Use a new address</option>
          {addresses.map((address) => (
            <option key={address.id} value={address.id}>
              {address.label} - {address.address_line1}, {address.city}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 font-body text-sm">
          <input
            type="checkbox"
            checked={saveChecked}
            onChange={(e) => onSaveToggle(e.target.checked)}
          />
          Save this address for future checkouts
        </label>
      </CardContent>
    </Card>
  );
}
