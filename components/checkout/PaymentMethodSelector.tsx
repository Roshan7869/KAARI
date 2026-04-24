import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentMethodSelectorProps {
  value: 'online' | 'cod';
  onChange: (method: 'online' | 'cod') => void;
}

export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl" id="payment-method-title">Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset>
          <legend className="sr-only">Payment Method</legend>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              checked={value === 'online'}
              onChange={() => onChange('online')}
              className="w-4 h-4"
              aria-label="Pay Online - Pay by card or UPI"
            />
            <span className="font-body">Pay Online</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              checked={value === 'cod'}
              onChange={() => onChange('cod')}
              className="w-4 h-4"
              aria-label="Cash on Delivery - Pay when you receive"
            />
            <span className="font-body">Cash on Delivery</span>
          </label>
        </fieldset>
      </CardContent>
    </Card>
  );
}
