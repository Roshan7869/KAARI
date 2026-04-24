import { Loader2 } from 'lucide-react';

export default function AdminPaymentSettingsLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading payment settings...</p>
      </div>
    </div>
  );
}
