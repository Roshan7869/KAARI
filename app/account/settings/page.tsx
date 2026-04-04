'use client';

import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import type { TablesUpdate } from '@/types/database';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { updateEmailPreferences, getEmailPreferences, type EmailPreferences } from '@/lib/notifications';

export default function AccountSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrefSaving, setIsPrefSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadPreferences(user.id);
    }
  }, [user?.id]);

  async function loadPreferences(userId: string) {
    const prefs = await getEmailPreferences(userId);
    if (prefs) {
      setEmailPreferences(prefs);
    }
  }

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePreference = (category: keyof EmailPreferences) => {
    if (!emailPreferences) return;

    const newValue = !emailPreferences[category];
    setEmailPreferences((prev) => (prev ? { ...prev, [category]: newValue } : null));
    setHasUnsavedChanges(true);
  };

  const handleSavePreferences = async () => {
    if (!user?.id || !emailPreferences) return;
    setIsPrefSaving(true);
    setHasUnsavedChanges(false);

    try {
      const result = await updateEmailPreferences(user.id, emailPreferences);

      if (result.success && result.preferences) {
        setEmailPreferences(result.preferences);
        toast.success('Email preferences saved successfully');
      } else {
        toast.error('Failed to save email preferences');
      }
    } catch (err) {
      toast.error('Failed to save email preferences');
    } finally {
      setIsPrefSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl text-foreground">Account Settings</h1>
        <p className="font-body text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Profile Settings</CardTitle>
          <CardDescription className="text-muted-foreground">
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email" className="font-body text-sm">Email</Label>
            <Input
              id="email"
              value={user.email || ''}
              disabled
              className="mt-1"
            />
            <p className="font-body text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <Label htmlFor="fullName" className="font-body text-sm">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
            />
          </div>

          <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Email Preferences</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose which email notifications you want to receive from Kaari.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailPreferences ? (
            <div className="space-y-6">
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
                  checked={emailPreferences.emailNotificationsEnabled}
                  onCheckedChange={() => handleTogglePreference('emailNotificationsEnabled')}
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
                  checked={emailPreferences.emailNotificationsEnabled}
                  onCheckedChange={() => handleTogglePreference('emailNotificationsEnabled')}
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
                  checked={emailPreferences.emailNotificationsEnabled}
                  onCheckedChange={() => handleTogglePreference('emailNotificationsEnabled')}
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
                  checked={emailPreferences.marketingEmailsEnabled}
                  onCheckedChange={() => handleTogglePreference('marketingEmailsEnabled')}
                />
              </div>

              <div className="pt-4 border-t border-kaari-warm-brown/20">
                <div className="flex items-center justify-end gap-2">
                  <div className="text-xs text-muted-foreground">
                    {hasUnsavedChanges && <span className="text-kaari-cream">Unsaved changes</span>}
                  </div>
                  <Button onClick={handleSavePreferences} disabled={isPrefSaving || !hasUnsavedChanges}>
                    {isPrefSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin text-muted-foreground mx-auto">Loading...</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Book */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Address Book</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your saved shipping addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-body text-sm text-muted-foreground">
            No saved addresses yet. Add an address during checkout.
          </p>
          <Button variant="outline" className="w-full md:w-auto">
            Add New Address
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
