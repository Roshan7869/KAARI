'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger-client';
import { type ProductVariant } from '@/hooks/useAdminProducts';
import { emptyVariantForm, type VariantFormData } from './types';

interface VariantManagerProps {
  variants: ProductVariant[];
  productId?: string;
  savedProductId: string | null;
  onVariantsChange: (variants: ProductVariant[]) => void;
  onCreateVariant: (data: {
    product_id: string;
    color: string | null;
    material: string | null;
    size: string | null;
    price: number | null;
    stock_qty: number;
    sku: string | null;
    is_default: boolean;
  }) => Promise<unknown>;
  onUpdateVariant: (data: {
    id: string;
    product_id: string;
    color: string | null;
    material: string | null;
    size: string | null;
    price: number | null;
    stock_qty: number;
    sku: string | null;
    is_default: boolean;
  }) => Promise<unknown>;
  onDeleteVariant: (data: { id: string; product_id: string }) => Promise<unknown>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function VariantManager({
  variants,
  productId,
  savedProductId,
  onVariantsChange,
  onCreateVariant,
  onUpdateVariant,
  onDeleteVariant,
  isCreating,
  isUpdating,
  isDeleting,
}: VariantManagerProps) {
  const currentProductId = productId || savedProductId;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>(emptyVariantForm);

  const handleOpenDialog = (variant?: ProductVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        color: variant.color || '',
        material: variant.material || '',
        size: variant.size || '',
        price_adjustment: (variant.price || 0).toString(),
        stock_qty: variant.stock_qty.toString(),
        sku: variant.sku || '',
        is_default: variant.is_default,
      });
    } else {
      setEditingVariant(null);
      setVariantForm(emptyVariantForm);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentProductId) {
      toast.error('Please save the product before adding variants');
      setIsDialogOpen(false);
      return;
    }

    const stockQty = parseInt(variantForm.stock_qty, 10);
    if (isNaN(stockQty) || stockQty < 0) {
      toast.error('Stock quantity must be 0 or greater');
      return;
    }

    const priceAdjustment = parseFloat(variantForm.price_adjustment);
    if (isNaN(priceAdjustment)) {
      toast.error('Price adjustment must be a valid number');
      return;
    }

    try {
      const variantData = {
        product_id: currentProductId,
        color: variantForm.color || null,
        material: variantForm.material || null,
        size: variantForm.size || null,
        price: priceAdjustment || null,
        stock_qty: stockQty,
        sku: variantForm.sku || null,
        is_default: variantForm.is_default,
      };

      if (editingVariant) {
        await onUpdateVariant({
          id: editingVariant.id,
          ...variantData,
        });
      } else {
        await onCreateVariant(variantData);
      }

      setIsDialogOpen(false);
      setVariantForm(emptyVariantForm);
      setEditingVariant(null);
    } catch (error) {
      logger.error('Error saving variant:', error);
    }
  };

  const handleDelete = async (variant: ProductVariant) => {
    if (!currentProductId) {
      toast.error('Cannot delete variants before product creation');
      return;
    }

    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      await onDeleteVariant({
        id: variant.id,
        product_id: currentProductId,
      });
    } catch (error) {
      logger.error('Error deleting variant:', error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Product Variants</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenDialog()}
            disabled={!productId && !savedProductId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </CardHeader>
        <CardContent>
          {!productId && !savedProductId && (
            <p className="text-sm text-muted-foreground mb-4">
              Save the product first to add variants.
            </p>
          )}

          {variants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Default</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Price Adj.</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      {variant.is_default && (
                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{variant.color || '-'}</TableCell>
                    <TableCell>{variant.material || '-'}</TableCell>
                    <TableCell>{variant.size || '-'}</TableCell>
                    <TableCell>
                      {variant.price != null ? `${variant.price > 0 ? '+' : ''}${variant.price}` : '0'}
                    </TableCell>
                    <TableCell>{variant.stock_qty}</TableCell>
                    <TableCell>{variant.sku || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => handleOpenDialog(variant)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => handleDelete(variant)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No variants added yet. Products without variants will use base price and stock.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-color">Color</Label>
                <Input
                  id="variant-color"
                  placeholder="e.g., Navy Blue"
                  value={variantForm.color}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, color: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-material">Material</Label>
                <Input
                  id="variant-material"
                  placeholder="e.g., Cotton"
                  value={variantForm.material}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, material: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-size">Size</Label>
                <Input
                  id="variant-size"
                  placeholder="e.g., Medium"
                  value={variantForm.size}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, size: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-sku">SKU</Label>
                <Input
                  id="variant-sku"
                  placeholder="e.g., BAG-001-M"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, sku: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-price">Price Adjustment (INR)</Label>
                <Input
                  id="variant-price"
                  type="number"
                  placeholder="0"
                  value={variantForm.price_adjustment}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, price_adjustment: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-stock">Stock Quantity *</Label>
                <Input
                  id="variant-stock"
                  type="number"
                  placeholder="0"
                  value={variantForm.stock_qty}
                  onChange={(e) => setVariantForm((prev) => ({ ...prev, stock_qty: e.target.value }))}
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="variant-default"
                checked={variantForm.is_default}
                onCheckedChange={(checked) => setVariantForm((prev) => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="variant-default">Set as default variant</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isCreating || isUpdating}
            >
              {(isCreating || isUpdating) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Variant'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
