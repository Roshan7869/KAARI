'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryPicker } from './CategoryPicker';
import { generateSlug, type ProductFormData, type FormErrors } from './types';

interface ProductBasicInfoProps {
  value: ProductFormData;
  errors: FormErrors;
  categories?: string[];
  onChange: (field: keyof ProductFormData, value: string | boolean) => void;
  onErrorClear: (field: keyof FormErrors) => void;
}

export function ProductBasicInfo({ value, errors, categories, onChange, onErrorClear }: ProductBasicInfoProps) {
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const handleTitleChange = (title: string) => {
    onChange('title', title);
    if (!isSlugManuallyEdited) {
      onChange('slug', generateSlug(title));
    }
    onErrorClear('title');
  };

  const handleSlugChange = (slug: string) => {
    onChange('slug', slug);
    setIsSlugManuallyEdited(true);
    onErrorClear('slug');
  };

  const handleBasePriceChange = (price: string) => {
    onChange('basePrice', price);
    onErrorClear('basePrice');
  };

  const handleCategoryChange = (category: string) => {
    onChange('category', category);
    onErrorClear('category');
  };

  return (
    <>
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Product Name *</Label>
              <Input
                id="title"
                placeholder="e.g., Handmade Crochet Bag"
                value={value.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                placeholder="e.g., handmade-crochet-bag"
                value={value.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className={errors.slug ? 'border-destructive' : ''}
              />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your product..."
              value={value.description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Category */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Pricing & Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (INR) *</Label>
              <Input
                id="basePrice"
                type="number"
                placeholder="2999"
                value={value.basePrice}
                onChange={(e) => handleBasePriceChange(e.target.value)}
                className={errors.basePrice ? 'border-destructive' : ''}
                min="0"
                step="1"
              />
              {errors.basePrice && <p className="text-sm text-destructive">{errors.basePrice}</p>}
            </div>

            <CategoryPicker
              value={value.category}
              categories={categories}
              onChange={handleCategoryChange}
              error={errors.category}
              onErrorClear={() => onErrorClear('category')}
            />

            <div className="space-y-2">
              <Label htmlFor="seasonTag">Season Tag</Label>
              <Input
                id="seasonTag"
                placeholder="e.g. Summer 2026, Festive, Monsoon"
                value={value.seasonTag}
                onChange={(e) => onChange('seasonTag', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional tag shown on the product detail page</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
