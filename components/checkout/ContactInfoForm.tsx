import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ContactInfoFormProps {
  formData: { email: string; full_name: string; phone: string };
  isGuest: boolean;
  formError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ContactInfoForm({
  formData,
  isGuest,
  formError,
  onChange,
}: ContactInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGuest && (
          <div>
            <label htmlFor="email" className="font-body text-sm font-medium">Email Address</label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              enterKeyHint="next"
              value={formData.email}
              onChange={onChange}
              required
              className="mt-1"
              aria-label="Email address for order updates (required)"
              aria-required="true"
              aria-describedby={formError ? "checkout-error" : undefined}
              placeholder="you@example.com"
            />
            <p className="font-body text-xs text-muted-foreground mt-1">We&apos;ll send order updates to this email.</p>
          </div>
        )}
        <div>
          <label htmlFor="full_name" className="font-body text-sm font-medium">Full Name</label>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            enterKeyHint="next"
            value={formData.full_name}
            onChange={onChange}
            required
            className="mt-1"
            aria-label="Full Name (required)"
            aria-required="true"
            aria-invalid={!!formError}
            aria-describedby={formError ? "checkout-error" : undefined}
          />
        </div>
        <div>
          <label htmlFor="phone" className="font-body text-sm font-medium">Phone</label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            value={formData.phone}
            onChange={onChange}
            required
            className="mt-1"
            aria-label="Phone number (required)"
            aria-required="true"
            aria-invalid={!!formError}
            aria-describedby={formError ? "checkout-error" : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}
