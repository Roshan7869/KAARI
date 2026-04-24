export interface CartCustomization {
  message: string;
  preferredSize?: string;
  preferredColor?: string;
  preferredMaterial?: string;
  deliveryDeadline?: string;
  budgetMin?: number;
  budgetMax?: number;
  quoteStatus: 'not_needed' | 'pending' | 'approved' | 'rejected';
  requiresManualReview: boolean;
  uploads: Array<{
    id: string;
    filePath: string;
    previewUrl?: string;
  }>;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  variantId?: string;
  title: string;
  image?: string;
  variantSize?: string;
  variantColor?: string;
  variantMaterial?: string;
  itemType: 'standard' | 'customized';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customization?: CartCustomization;
}

export interface Cart {
  cartId: string;
  userId: string;
  currency: string;
  items: CartItem[];
  pricing: {
    subtotal: number;
    shipping: number;
    tax: number;
    cgst: number;
    sgst: number;
    total: number;
  };
}
