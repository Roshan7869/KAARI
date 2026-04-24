import { Loader2 } from 'lucide-react';

export default function AccountSettingsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading account settings...</p>
      </div>
    </div>
  );
}
