// Shared types and utilities for product form components

export interface FormErrors {
  title?: string;
  slug?: string;
  basePrice?: string;
  category?: string;
}

export interface VariantFormData {
  color: string;
  material: string;
  size: string;
  price_adjustment: string;
  stock_qty: string;
  sku: string;
  is_default: boolean;
}

export const emptyVariantForm: VariantFormData = {
  color: '',
  material: '',
  size: '',
  price_adjustment: '0',
  stock_qty: '0',
  sku: '',
  is_default: false,
};

export interface ProductFormData {
  title: string;
  slug: string;
  description: string;
  basePrice: string;
  category: string;
  seasonTag: string;
  productType: 'standard' | 'customized';
  allowCustomization: boolean;
  isActive: boolean;
}

export interface DisplayOptions {
  hasSizeSelector: boolean;
  sizeOptions: string[];
  sizeInput: string;
  hasColorSelector: boolean;
  colorOptions: Array<{ name: string; hex: string }>;
  colorInput: string;
  colorHex: string;
  trustBadgesMode: 'default' | 'custom';
  customBadges: Array<{ icon: string; label: string }>;
  showRelatedProducts: boolean;
  whatsappCtaUrl: string;
  adminNote: string;
}

export const defaultDisplayOptions: DisplayOptions = {
  hasSizeSelector: false,
  sizeOptions: [],
  sizeInput: '',
  hasColorSelector: false,
  colorOptions: [],
  colorInput: '',
  colorHex: '#8B1F2A',
  trustBadgesMode: 'default',
  customBadges: [
    { icon: '🧶', label: '100% Handmade' },
    { icon: '🚚', label: 'Free Ship ₹999+' },
    { icon: '🔒', label: 'Secure UPI' },
  ],
  showRelatedProducts: true,
  whatsappCtaUrl: '',
  adminNote: '',
};

// Slug generation utility
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Validation utilities
export function validateTitle(title: string): string | undefined {
  if (!title.trim()) return 'Product name is required';
  if (title.length < 2) return 'Product name must be at least 2 characters';
  if (title.length > 200) return 'Product name must be less than 200 characters';
}

export function validateSlug(slug: string): string | undefined {
  if (!slug.trim()) return 'Slug is required';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Slug must be lowercase alphanumeric with dashes';
  }
  if (slug.length > 100) return 'Slug must be less than 100 characters';
}

export function validateBasePrice(price: string): string | undefined {
  const num = parseFloat(price);
  if (isNaN(num)) return 'Price must be a valid number';
  if (num <= 0) return 'Price must be greater than 0';
  if (num > 9999999) return 'Price is too large';
}

export function validateCategory(category: string): string | undefined {
  if (!category.trim()) return 'Category is required';
}
