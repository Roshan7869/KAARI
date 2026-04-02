'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { getEmailPreferences, updateEmailPreferences, type EmailPreferences } from '@/lib/notifications';

interface EmailPreferencesProps {
  userId: string;
}

export default function EmailPreferences({ userId }: EmailPreferencesProps) {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadPreferences = useCallback(async () => {
    const loaded = await getEmailPreferences(userId);
    if (loaded) {
      setPreferences(loaded);
    } else {
      toast.error('Failed to load email preferences');
    }
  }, [userId]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Track unsaved changes
  const handleToggle = (category: keyof EmailPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[category];
    setPreferences((prev) => (prev ? { ...prev, [category]: newValue } : null));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!preferences || !userId) return;

    setIsSaving(true);
    setHasUnsavedChanges(false);

    try {
      const result = await updateEmailPreferences(userId, preferences);

      if (result.success && result.preferences) {
        setPreferences(result.preferences);
        toast.success('Email preferences saved successfully', {
          description: 'Your notification settings have been updated.',
          icon: <Check className="w-4 h-4" />,
        });
      } else {
        toast.error('Failed to save email preferences', {
          description: result.error || 'Please try again.',
          icon: <AlertCircle className="w-4 h-4" />,
        });
      }
    } catch (err) {
      toast.error('Failed to save email preferences', {
        description: 'An unexpected error occurred. Please try again.',
        icon: <AlertCircle className="w-4 h-4" />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!preferences) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>Loading your notification settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Email Preferences</CardTitle>
        <CardDescription>
          Choose which email notifications you want to receive from Kaari.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-order-confirmation" className="font-medium">
                Order Confirmations
              </Label>
              <p className="font-body text-xs text-muted-foreground">
                Receive confirmation when your order is placed
              </p>
            </div>
            <Switch
              id="toggle-order-confirmation"
              checked={preferences.emailNotificationsEnabled}
              onCheckedChange={() => handleToggle('emailNotificationsEnabled')}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-shipping-updates" className="font-medium">
                Shipping Updates
              </Label>
              <p className="font-body text-xs text-muted-foreground">
                Get tracking info when your order ships
              </p>
            </div>
            <Switch
              id="toggle-shipping-updates"
              checked={preferences.emailNotificationsEnabled}
              onCheckedChange={() => handleToggle('emailNotificationsEnabled')}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-payment-alerts" className="font-medium">
                Payment Alerts
              </Label>
              <p className="font-body text-xs text-muted-foreground">
                Updates about payment processing
              </p>
            </div>
            <Switch
              id="toggle-payment-alerts"
              checked={preferences.emailNotificationsEnabled}
              onCheckedChange={() => handleToggle('emailNotificationsEnabled')}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-marketing" className="font-medium">
                Marketing Emails
              </Label>
              <p className="font-body text-xs text-muted-foreground">
                Special offers, new products, and promotions (opt-in)
              </p>
            </div>
            <Switch
              id="toggle-marketing"
              checked={preferences.marketingEmailsEnabled}
              onCheckedChange={() => handleToggle('marketingEmailsEnabled')}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-muted-foreground">
            {hasUnsavedChanges && (
              <span className="text-kaari-cream">Unsaved changes</span>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
