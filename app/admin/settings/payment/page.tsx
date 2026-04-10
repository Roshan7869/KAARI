'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, Eye, EyeOff, TestTube, Zap, Loader2 } from 'lucide-react';

interface PaymentConfigResponse {
  id: string | null;
  provider: string;
  api_key_masked: string;
  has_api_secret: boolean;
  has_webhook_secret: boolean;
  is_test_mode: boolean;
  is_active: boolean;
  updated_at: string | null;
}

export default function PaymentGatewaySettings() {
  const queryClient = useQueryClient();
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState({
    api_key: '',
    api_secret: '',
    webhook_secret: '',
    is_test_mode: true,
    is_active: false,
  });

  // Fetch config via server API (masked secrets, never exposed)
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['payment-gateway-config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings/payment');
      if (!res.ok) throw new Error('Failed to fetch payment config');
      return res.json() as Promise<PaymentConfigResponse>;
    },
  });

  useEffect(() => {
    if (existingConfig) {
      setConfig({
        api_key: existingConfig.api_key_masked || '',
        api_secret: existingConfig.has_api_secret ? '••••••••' : '',
        webhook_secret: existingConfig.has_webhook_secret ? '••••••••' : '',
        is_test_mode: existingConfig.is_test_mode,
        is_active: existingConfig.is_active,
      });
      setIsEditing(false);
    }
  }, [existingConfig]);

  // Save config via server API (secrets written server-side, never returned)
  const saveMutation = useMutation({
    mutationFn: async (gatewayConfig: typeof config) => {
      const res = await fetch('/api/admin/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayConfig),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-config'] });
      toast.success('Payment gateway settings saved!');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (config.is_active && (!config.api_key || !config.api_secret || config.api_key.includes('••'))) {
      toast.error('API Key and Secret are required to activate the gateway.');
      return;
    }
    saveMutation.mutate(config);
  };

  const startEditing = () => {
    setConfig(prev => ({
      ...prev,
      api_key: '',
      api_secret: '',
      webhook_secret: '',
    }));
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Payment Gateway</h1>
        <p className="font-body text-muted-foreground mt-1">
          Configure Cashfree payment gateway for UPI payments
        </p>
      </div>

      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            {config.is_test_mode ? (
              <TestTube className="h-5 w-5 text-yellow-500" />
            ) : (
              <Zap className="h-5 w-5 text-green-500" />
            )}
            Gateway Mode
          </CardTitle>
          <CardDescription className="font-body">
            Toggle between sandbox (test) and production mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, is_test_mode: true }))}
              className={`flex-1 p-4 rounded-lg border-2 transition-all text-center ${
                config.is_test_mode
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-border hover:border-yellow-200'
              }`}
            >
              <TestTube className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="font-body font-medium text-sm">Sandbox</p>
              <p className="font-body text-xs text-muted-foreground">For testing</p>
            </button>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, is_test_mode: false }))}
              className={`flex-1 p-4 rounded-lg border-2 transition-all text-center ${
                !config.is_test_mode
                  ? 'border-green-500 bg-green-50'
                  : 'border-border hover:border-green-200'
              }`}
            >
              <Zap className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="font-body font-medium text-sm">Production</p>
              <p className="font-body text-xs text-muted-foreground">Live payments</p>
            </button>
          </div>

          {!config.is_test_mode && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-body text-sm text-red-700 font-medium">
                ⚠️ Production mode will process real payments. Ensure your credentials are correct.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            API Credentials
          </CardTitle>
          <CardDescription className="font-body">
            {isEditing ? (
              'Enter your Cashfree credentials below'
            ) : (
              <>
                Credentials are stored securely.{' '}
                <button onClick={startEditing} className="text-primary hover:underline font-medium">
                  Update credentials
                </button>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* App ID */}
          <div>
            <label className="font-body text-sm font-medium">App ID (Client ID)</label>
            <Input
              value={config.api_key}
              onChange={(e) => { setConfig((prev) => ({ ...prev, api_key: e.target.value })); setIsEditing(true); }}
              placeholder={config.is_test_mode ? 'TEST_APP_ID_xxxxx' : 'APP_ID_xxxxx'}
              className="mt-1 font-mono text-sm"
              type={isEditing ? 'text' : 'text'}
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="font-body text-sm font-medium">Secret Key</label>
            <div className="relative mt-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={config.api_secret}
                onChange={(e) => { setConfig((prev) => ({ ...prev, api_secret: e.target.value })); setIsEditing(true); }}
                placeholder={isEditing ? 'cfsk_xxxxx' : '••••••••'}
                className="font-mono text-sm pr-10"
                disabled={!isEditing && config.api_secret === '••••••••'}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="font-body text-sm font-medium">Webhook Secret</label>
            <div className="relative mt-1">
              <Input
                type={showWebhookSecret ? 'text' : 'password'}
                value={config.webhook_secret}
                onChange={(e) => { setConfig((prev) => ({ ...prev, webhook_secret: e.target.value })); setIsEditing(true); }}
                placeholder={isEditing ? 'whsec_xxxxx' : '••••••••'}
                className="font-mono text-sm pr-10"
                disabled={!isEditing && config.webhook_secret === '••••••••'}
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Used to verify webhook signatures from Cashfree
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activation */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Gateway Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) => setConfig((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="w-5 h-5 rounded"
            />
            <div>
              <p className="font-body font-medium">
                {config.is_active ? 'Gateway Active' : 'Gateway Inactive'}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {config.is_active
                  ? 'Online payments will be processed through Cashfree.'
                  : 'Online payments will use the dummy/test payment system.'}
              </p>
            </div>
          </label>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full"
            size="lg"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URL Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Webhook Configuration</CardTitle>
          <CardDescription className="font-body">
            Add this URL in your Cashfree dashboard under Webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-3">
            <p className="font-mono text-sm break-all select-all">
              {typeof window !== 'undefined' ? window.location.origin : 'https://kaari.com'}/api/webhooks/payment
            </p>
          </div>
          <p className="font-body text-xs text-muted-foreground mt-2">
            Events to subscribe: <code>PAYMENT_SUCCESS</code>, <code>PAYMENT_FAILED</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}