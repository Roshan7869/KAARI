'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RETURN_REASONS = [
  { value: 'damaged', label: 'Item arrived damaged' },
  { value: 'wrong_item', label: 'Received wrong item' },
  { value: 'quality', label: 'Quality not as expected' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
];

type OrderItem = {
  id: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
};

type EligibilityResponse = {
  eligible: boolean;
  reason?: string;
  order?: {
    id: string;
    items: OrderItem[];
  };
};

export default function ReturnPortalPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(`/api/orders/${params.orderId}/return`)
      .then((r) => r.json())
      .then((data: EligibilityResponse) => {
        setEligibility(data);
        if (data.eligible && data.order) {
          // Default all items selected at full quantity
          const defaults: Record<string, number> = {};
          for (const item of data.order.items) {
            defaults[item.id] = item.quantity;
          }
          setSelectedItems(defaults);
        }
      })
      .catch(() => setError('Failed to load order details'))
      .finally(() => setLoading(false));
  }, [params.orderId]);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a return reason');
      return;
    }

    const returnItems = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([order_item_id, quantity]) => ({ order_item_id, quantity, reason }));

    if (returnItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${params.orderId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: returnItems, reason, description }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit return request');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-body text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <CheckCircle2 className="h-14 w-14 mx-auto text-green-500 mb-4" />
          <h1 className="font-display text-2xl text-foreground mb-2">Return Request Submitted</h1>
          <p className="font-body text-muted-foreground mb-6">
            We&apos;ve received your return request. Our team will review it and contact you within 2 business days.
          </p>
          <Button asChild variant="outline">
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!eligibility?.eligible) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <div className="border border-yellow-200 rounded-xl p-6 bg-yellow-50 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-body font-medium text-yellow-800">Return Not Available</p>
              <p className="font-body text-sm text-yellow-700 mt-0.5">
                {eligibility?.reason ?? 'This order is not eligible for a return.'}
              </p>
              <p className="font-body text-sm text-yellow-700 mt-2">
                If you need help, email us at{' '}
                <a href="mailto:support@kaari.in" className="underline">support@kaari.in</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = eligibility.order?.items ?? [];
  const returnableItems = items.filter((item) => !item.isCustom);
  const customItems = items.filter((item) => item.isCustom);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href={`/orders/${params.orderId}/track`}
          className="inline-flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </Link>

        <div className="mb-6">
          <h1 className="font-display text-2xl text-foreground">Request a Return</h1>
          <p className="font-body text-sm text-muted-foreground mt-1">
            Return window: 7 days from delivery. Custom orders are non-returnable.
          </p>
        </div>

        {/* Items to return */}
        <div className="border rounded-xl p-5 bg-card mb-4">
          <h2 className="font-body font-semibold text-foreground mb-3">Select Items to Return</h2>

          {returnableItems.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">No returnable items found.</p>
          ) : (
            <div className="space-y-3">
              {returnableItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">{item.productTitle}</p>
                    <p className="font-body text-xs text-muted-foreground">₹{item.unitPrice} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-xs text-muted-foreground">Qty:</span>
                    <select
                      value={selectedItems[item.id] ?? 0}
                      onChange={(e) =>
                        setSelectedItems((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                      }
                      className="border rounded px-2 py-1 font-body text-sm"
                    >
                      {Array.from({ length: item.quantity + 1 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {customItems.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Custom items are not eligible for return: {customItems.map((i) => i.productTitle).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="border rounded-xl p-5 bg-card mb-4 space-y-4">
          <h2 className="font-body font-semibold text-foreground">Return Reason</h2>

          <div>
            <Label className="font-body text-sm">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-body text-sm">Additional Details (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in more detail..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
        </div>

        {error && (
          <p className="font-body text-sm text-red-600 mb-3">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting || returnableItems.length === 0}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Return Request'}
        </Button>

        <p className="font-body text-xs text-muted-foreground text-center mt-3">
          For urgent issues, contact us at{' '}
          <a href="mailto:support@kaari.in" className="underline">support@kaari.in</a>
        </p>
      </div>
    </div>
  );
}
