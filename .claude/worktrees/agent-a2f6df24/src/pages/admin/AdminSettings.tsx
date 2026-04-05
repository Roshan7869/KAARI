import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  CreditCard,
  Bell,
  Truck,
  Save,
  Loader2,
  Package,
  DollarSign,
  Smartphone,
  Building2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);

  // Store settings
  const [storeName, setStoreName] = useState('Kaari Marketplace');
  const [storeDescription, setStoreDescription] = useState('Handmade crochet products crafted with love');
  const [storeEmail, setStoreEmail] = useState('support@kaari.com');
  const [storePhone, setStorePhone] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Payment settings
  const [codEnabled, setCodEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [netbankingEnabled, setNetbankingEnabled] = useState(false);
  const [walletEnabled, setWalletEnabled] = useState(false);

  // Cashfree settings
  const [cashfreeEnabled, setCashfreeEnabled] = useState(false);
  const [cashfreeAppId, setCashfreeAppId] = useState('');
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState('');
  const [cashfreeSandbox, setCashfreeSandbox] = useState(true);

  // Razorpay settings (legacy)
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  // Shipping settings
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('500');
  const [standardShippingRate, setStandardShippingRate] = useState('50');
  const [expressShippingRate, setExpressShippingRate] = useState('100');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to the database
      // For now, we'll simulate a save operation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store in localStorage as a temporary solution
      const settings = {
        store: {
          name: storeName,
          description: storeDescription,
          email: storeEmail,
          phone: storePhone,
          currency,
        },
        payment: {
          codEnabled,
          upiEnabled,
          cardEnabled,
          netbankingEnabled,
          walletEnabled,
          cashfreeEnabled,
          cashfreeAppId,
          cashfreeSandbox,
          razorpayEnabled,
          razorpayKeyId,
        },
        shipping: {
          freeShippingThreshold,
          standardShippingRate,
          expressShippingRate,
        },
        notifications: {
          emailNotifications,
          orderNotifications,
          lowStockAlerts,
          lowStockThreshold,
        },
      };

      localStorage.setItem('adminSettings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-3xl text-foreground">Settings</h1>
        <p className="font-body text-muted-foreground mt-1">
          Manage your store settings and preferences
        </p>
      </motion.div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Shipping</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Store Information
                </CardTitle>
                <CardDescription>
                  Basic information about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Your store name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeDescription">Store Description</Label>
                  <Textarea
                    id="storeDescription"
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Brief description of your store"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Contact Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      value={storeEmail}
                      onChange={(e) => setStoreEmail(e.target.value)}
                      placeholder="support@yourstore.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Contact Phone</Label>
                    <Input
                      id="storePhone"
                      type="tel"
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Configure available payment options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Gateway Selection */}
                <div className="space-y-4">
                  <h3 className="font-body font-medium text-foreground">Payment Gateway</h3>

                  {/* Cashfree (Recommended) */}
                  <div className="p-4 bg-accent/5 rounded-lg border-2 border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-body font-medium">Cashfree</p>
                          <p className="font-body text-sm text-muted-foreground">
                            Recommended for UPI, Cards, Netbanking
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={cashfreeEnabled}
                        onCheckedChange={setCashfreeEnabled}
                      />
                    </div>

                    {cashfreeEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pl-14"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="cashfreeAppId">App ID</Label>
                            <Input
                              id="cashfreeAppId"
                              value={cashfreeAppId}
                              onChange={(e) => setCashfreeAppId(e.target.value)}
                              placeholder="CF_APP_ID_xxxxx"
                              type="password"
                            />
                            <p className="font-body text-xs text-muted-foreground">
                              Find your App ID in Cashfree Dashboard → Developers → API Keys
                            </p>
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="cashfreeSecretKey">Secret Key</Label>
                            <Input
                              id="cashfreeSecretKey"
                              value={cashfreeSecretKey}
                              onChange={(e) => setCashfreeSecretKey(e.target.value)}
                              placeholder="cfsk_xxxxx"
                              type="password"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <input
                            type="checkbox"
                            id="cashfreeSandbox"
                            checked={cashfreeSandbox}
                            onChange={(e) => setCashfreeSandbox(e.target.checked)}
                            className="w-4 h-4 rounded border-border"
                          />
                          <Label htmlFor="cashfreeSandbox" className="font-body text-sm text-amber-800 dark:text-amber-200">
                            Use Sandbox Mode (for testing)
                          </Label>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Razorpay (Alternative) */}
                  <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-body font-medium">Razorpay (Alternative)</p>
                        <p className="font-body text-sm text-muted-foreground">
                          Alternative payment gateway
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={razorpayEnabled}
                      onCheckedChange={setRazorpayEnabled}
                    />
                  </div>

                  {razorpayEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="ml-14 space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="razorpayKeyId">Razorpay Key ID</Label>
                        <Input
                          id="razorpayKeyId"
                          value={razorpayKeyId}
                          onChange={(e) => setRazorpayKeyId(e.target.value)}
                          placeholder="rzp_test_xxxxx"
                        />
                        <p className="font-body text-xs text-muted-foreground">
                          Find your Key ID in Razorpay Dashboard → Settings → API Keys
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <hr className="border-border" />

                {/* Payment Methods Available */}
                <div className="space-y-4">
                  <h3 className="font-body font-medium text-foreground">Available Payment Methods</h3>

                  {/* Cash on Delivery */}
                  <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-body font-medium">Cash on Delivery</p>
                        <p className="font-body text-sm text-muted-foreground">
                          Accept cash payment on delivery
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={codEnabled}
                      onCheckedChange={setCodEnabled}
                    />
                  </div>

                  {/* UPI */}
                  <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-body font-medium">UPI</p>
                        <p className="font-body text-sm text-muted-foreground">
                          Google Pay, PhonePe, Paytm, BHIM and more
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={upiEnabled}
                      onCheckedChange={setUpiEnabled}
                    />
                  </div>

                  {/* Cards */}
                  <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-body font-medium">Credit / Debit Cards</p>
                        <p className="font-body text-sm text-muted-foreground">
                          Visa, Mastercard, RuPay cards
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={cardEnabled}
                      onCheckedChange={setCardEnabled}
                    />
                  </div>

                  {/* Net Banking */}
                  <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-body font-medium">Net Banking</p>
                        <p className="font-body text-sm text-muted-foreground">
                          All major Indian banks supported
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={netbankingEnabled}
                      onCheckedChange={setNetbankingEnabled}
                    />
                  </div>

                  {/* Wallets */}
                  <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-body font-medium">Wallets</p>
                        <p className="font-body text-sm text-muted-foreground">
                          Paytm, Amazon Pay, MobiKwik
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={walletEnabled}
                      onCheckedChange={setWalletEnabled}
                    />
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="font-body text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Your secret keys are stored securely in the browser's localStorage.
                    For production, we recommend using environment variables and server-side key management.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipping Configuration
                </CardTitle>
                <CardDescription>
                  Configure shipping rates and options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="freeShippingThreshold">Free Shipping Threshold (₹)</Label>
                  <Input
                    id="freeShippingThreshold"
                    type="number"
                    min="0"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    placeholder="500"
                  />
                  <p className="font-body text-xs text-muted-foreground">
                    Orders above this amount get free shipping
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="standardShippingRate">Standard Shipping Rate (₹)</Label>
                    <Input
                      id="standardShippingRate"
                      type="number"
                      min="0"
                      value={standardShippingRate}
                      onChange={(e) => setStandardShippingRate(e.target.value)}
                      placeholder="50"
                    />
                    <p className="font-body text-xs text-muted-foreground">
                      Standard delivery (5-7 business days)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expressShippingRate">Express Shipping Rate (₹)</Label>
                    <Input
                      id="expressShippingRate"
                      type="number"
                      min="0"
                      value={expressShippingRate}
                      onChange={(e) => setExpressShippingRate(e.target.value)}
                      placeholder="100"
                    />
                    <p className="font-body text-xs text-muted-foreground">
                      Express delivery (2-3 business days)
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="font-body text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Shipping zones and carrier integration can be configured in
                    advanced settings. Contact support for custom shipping rules.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications & Alerts
                </CardTitle>
                <CardDescription>
                  Configure notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                  <div>
                    <p className="font-body font-medium">Email Notifications</p>
                    <p className="font-body text-sm text-muted-foreground">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                  <div>
                    <p className="font-body font-medium">Order Notifications</p>
                    <p className="font-body text-sm text-muted-foreground">
                      Get notified for new orders and status changes
                    </p>
                  </div>
                  <Switch
                    checked={orderNotifications}
                    onCheckedChange={setOrderNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-body font-medium">Low Stock Alerts</p>
                        <p className="font-body text-sm text-muted-foreground">
                          Get alerts when products are running low
                        </p>
                      </div>
                      <Switch
                        checked={lowStockAlerts}
                        onCheckedChange={setLowStockAlerts}
                      />
                    </div>
                    {lowStockAlerts && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4"
                      >
                        <div className="flex items-center gap-4">
                          <Label htmlFor="lowStockThreshold" className="whitespace-nowrap">
                            Alert when stock falls below:
                          </Label>
                          <Input
                            id="lowStockThreshold"
                            type="number"
                            min="1"
                            className="w-24"
                            value={lowStockThreshold}
                            onChange={(e) => setLowStockThreshold(e.target.value)}
                          />
                          <span className="font-body text-sm text-muted-foreground">units</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}