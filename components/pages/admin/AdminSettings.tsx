'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useMutation } from '@tanstack/react-query';

export default function AdminSettings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
    },
  });

  const handleUpdateProfile = () => {
    updateProfile.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Settings</h1>
        <p className="font-body text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-body text-sm font-medium">Email</label>
            <Input
              value={user?.email || ''}
              disabled
              className="mt-1"
            />
            <p className="font-body text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="font-body text-sm font-medium">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>

          {updateProfile.isSuccess && (
            <p className="font-body text-sm text-green-600">
              Profile updated successfully
            </p>
          )}
          {updateProfile.isError && (
            <p className="font-body text-sm text-red-600">
              Failed to update profile
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground mb-4">
            These actions are irreversible. Please proceed with caution.
          </p>
          <Button variant="destructive" disabled>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}