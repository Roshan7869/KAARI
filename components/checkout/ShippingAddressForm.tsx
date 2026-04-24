import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ShippingAddressFormProps {
  formData: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
  };
  formError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPincodeBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onPincodeChange: (value: string) => void;
  pincodeLoading: boolean;
  pincodeDone: boolean;
}

export function ShippingAddressForm({
  formData,
  formError,
  onChange,
  onPincodeBlur,
  onPincodeChange,
  pincodeLoading,
  pincodeDone,
}: ShippingAddressFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Shipping Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="address_line1" className="font-body text-sm font-medium">Address Line 1</label>
          <Input
            id="address_line1"
            name="address_line1"
            autoComplete="address-line1"
            enterKeyHint="next"
            value={formData.address_line1}
            onChange={onChange}
            required
            className="mt-1"
            aria-label="Street address (required)"
            aria-required="true"
            aria-invalid={!!formError}
            aria-describedby={formError ? "checkout-error" : undefined}
          />
        </div>
        <div>
          <label htmlFor="address_line2" className="font-body text-sm font-medium">Address Line 2</label>
          <Input
            id="address_line2"
            name="address_line2"
            autoComplete="address-line2"
            enterKeyHint="next"
            value={formData.address_line2}
            onChange={onChange}
            className="mt-1"
            aria-label="Apartment, suite, etc. (optional)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="font-body text-sm font-medium">City</label>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              enterKeyHint="next"
              value={formData.city}
              onChange={onChange}
              required
              className="mt-1"
              aria-label="City (required)"
              aria-required="true"
              aria-invalid={!!formError}
              aria-describedby={formError ? "checkout-error" : undefined}
            />
          </div>
          <div>
            <label htmlFor="state" className="font-body text-sm font-medium">State</label>
            <Input
              id="state"
              name="state"
              autoComplete="address-level1"
              enterKeyHint="next"
              value={formData.state}
              onChange={onChange}
              required
              className="mt-1"
              aria-label="State (required)"
              aria-required="true"
              aria-invalid={!!formError}
              aria-describedby={formError ? "checkout-error" : undefined}
            />
          </div>
        </div>
        <div>
          <label htmlFor="postal_code" className="font-body text-sm font-medium">Postal Code</label>
          <div className="relative mt-1">
            <Input
              id="postal_code"
              name="postal_code"
              autoComplete="postal-code"
              enterKeyHint="done"
              value={formData.postal_code}
              onChange={(e) => {
                // Strip non-digits and limit to 6 characters
                const numericValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                onPincodeChange(numericValue);
              }}
              onBlur={onPincodeBlur}
              inputMode="numeric"
              pattern="[1-9][0-9]{5}"
              maxLength={6}
              required
              className="mt-0 pr-8"
              aria-label="Postal code or ZIP (required) - 6 digits only"
              aria-required="true"
              aria-invalid={!!formError}
              aria-describedby={formError ? "checkout-error" : undefined}
            />
            {pincodeLoading && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                …
              </span>
            )}
            {pincodeDone && !pincodeLoading && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 text-xs" aria-label="City and state auto-filled">
                ✓
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
