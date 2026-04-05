import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { trackEvent } from '@/lib/analytics';

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
    total: number;
  };
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculatePricing = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = subtotal > 0 ? 99 : 0;
    const tax = 0;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  };

  type CartItemCustomizationRow = Tables<'cart_item_customizations'> & {
    customization_uploads: Tables<'customization_uploads'>[] | null;
  };

  type CartItemWithRelations = Tables<'cart_items'> & {
    products: Pick<Tables<'products'>, 'title'> | null;
    cart_item_customizations: CartItemCustomizationRow | null;
  };
  type VariantStockRow = Pick<Tables<'product_variants'>, 'id' | 'product_id' | 'stock_qty' | 'is_default'>;

  const getOrCreateActiveCart = useCallback(async (userId: string) => {
    const { data: existingCart, error: existingCartError } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCartError) throw existingCartError;
    if (existingCart) return existingCart;

    const { data: createdCart, error: createCartError } = await supabase
      .from('carts')
      .insert({ user_id: userId, status: 'active', currency: 'INR' })
      .select()
      .single();

    if (createCartError) throw createCartError;
    return createdCart;
  }, []);

  const resolveVariantForStock = useCallback(async (productId: string, variantId?: string): Promise<VariantStockRow | null> => {
    if (variantId) {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, stock_qty, is_default')
        .eq('id', variantId)
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('product_variants')
      .select('id, product_id, stock_qty, is_default')
      .eq('product_id', productId)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCart(null);
        return;
      }

      const activeCart = await getOrCreateActiveCart(user.id);

      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (title),
          cart_item_customizations (
            *,
            customization_uploads (*)
          )
        `)
        .eq('cart_id', activeCart.id);

      if (itemsError) throw itemsError;

      const cartItems: CartItem[] = ((items || []) as CartItemWithRelations[]).map((item) => ({
        cartItemId: item.id,
        productId: item.product_id,
        variantId: item.variant_id || undefined,
        title: item.products?.title || 'Unknown Product',
        itemType: (item.item_type as 'standard' | 'customized') || 'standard',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
        customization: item.cart_item_customizations ? {
          message: item.cart_item_customizations.customization_message,
          preferredSize: item.cart_item_customizations.preferred_size || undefined,
          preferredColor: item.cart_item_customizations.preferred_color || undefined,
          preferredMaterial: item.cart_item_customizations.preferred_material || undefined,
          deliveryDeadline: item.cart_item_customizations.delivery_deadline || undefined,
          budgetMin: item.cart_item_customizations.budget_min || undefined,
          budgetMax: item.cart_item_customizations.budget_max || undefined,
          quoteStatus: (item.cart_item_customizations.quote_status as any) || 'pending',
          requiresManualReview: item.cart_item_customizations.requires_manual_review,
          uploads: (item.cart_item_customizations.customization_uploads || []).map((u) => ({
            id: u.id,
            filePath: u.file_path,
          })),
        } : undefined,
      }));

      setCart({
        cartId: activeCart.id,
        userId: user.id,
        currency: 'INR',
        items: cartItems,
        pricing: calculatePricing(cartItems),
      });
    } catch (err) {
      console.error('Cart refresh error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [getOrCreateActiveCart]);

  const addToCart = async (item: Omit<CartItem, 'cartItemId' | 'lineTotal'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const activeCart = await getOrCreateActiveCart(user.id);

      const resolvedVariant = await resolveVariantForStock(item.productId, item.variantId);
      if (!resolvedVariant) {
        throw new Error('Stock variant is missing for this product.');
      }

      const lineTotal = item.unitPrice * item.quantity;

      let cartItemId: string;

      if (!item.customization) {
        const existingItemQuery = supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('cart_id', activeCart.id)
          .eq('product_id', item.productId)
          .eq('item_type', item.itemType)
          .eq('variant_id', resolvedVariant.id);

        const { data: existingItem, error: existingItemError } = await existingItemQuery.maybeSingle();
        if (existingItemError) throw existingItemError;

        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          if (newQuantity > resolvedVariant.stock_qty) {
            throw new Error(`Only ${resolvedVariant.stock_qty} item(s) left in stock.`);
          }
          const newLineTotal = newQuantity * item.unitPrice;
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: newQuantity, line_total: newLineTotal, unit_price: item.unitPrice })
            .eq('id', existingItem.id);

          if (updateError) throw updateError;
          cartItemId = existingItem.id;
        } else {
          if (item.quantity > resolvedVariant.stock_qty) {
            throw new Error(`Only ${resolvedVariant.stock_qty} item(s) left in stock.`);
          }
          const { data: insertedItem, error: insertError } = await supabase
            .from('cart_items')
            .insert({
              cart_id: activeCart.id,
              product_id: item.productId,
              variant_id: resolvedVariant.id,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              line_total: lineTotal,
              item_type: item.itemType,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          cartItemId = insertedItem.id;
        }
      } else {
        if (item.quantity > resolvedVariant.stock_qty) {
          throw new Error(`Only ${resolvedVariant.stock_qty} item(s) left in stock.`);
        }
        const { data: insertedItem, error: insertError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: activeCart.id,
            product_id: item.productId,
            variant_id: resolvedVariant.id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: lineTotal,
            item_type: item.itemType,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        cartItemId = insertedItem.id;
      }

      if (item.customization) {
        const { error: customError } = await supabase
          .from('cart_item_customizations')
          .insert({
            cart_item_id: cartItemId,
            customization_message: item.customization.message,
            preferred_size: item.customization.preferredSize,
            preferred_color: item.customization.preferredColor,
            preferred_material: item.customization.preferredMaterial,
            delivery_deadline: item.customization.deliveryDeadline,
            budget_min: item.customization.budgetMin,
            budget_max: item.customization.budgetMax,
            quote_status: item.customization.quoteStatus,
            requires_manual_review: item.customization.requiresManualReview,
          });

        if (customError) throw customError;
      }

      await refreshCart();
      toast.success('Added to cart');
      trackEvent('add_to_cart', {
        item_id: item.productId,
        item_name: item.title,
        price: item.unitPrice,
        quantity: item.quantity,
        currency: 'INR',
      });
    } catch (err) {
      console.error('Add to cart error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to add to cart');
      throw err;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      const item = cart?.items.find(i => i.cartItemId === cartItemId);
      if (!item) throw new Error('Item not found');

      const variant = await resolveVariantForStock(item.productId, item.variantId);
      if (!variant) {
        throw new Error('Stock variant is missing for this cart item.');
      }
      if (quantity > variant.stock_qty) {
        throw new Error(`Only ${variant.stock_qty} item(s) left in stock.`);
      }

      const lineTotal = item.unitPrice * quantity;

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, line_total: lineTotal })
        .eq('id', cartItemId);

      if (error) throw error;

      await refreshCart();
      toast.success('Cart updated');
    } catch (err) {
      console.error('Update quantity error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update quantity');
      throw err;
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      await refreshCart();
      toast.success('Item removed');
    } catch (err) {
      console.error('Remove item error:', err);
      toast.error('Failed to remove item');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      if (!cart) return;

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.cartId);

      if (error) throw error;

      await refreshCart();
      toast.success('Cart cleared');
    } catch (err) {
      console.error('Clear cart error:', err);
      toast.error('Failed to clear cart');
      throw err;
    }
  };

  useEffect(() => {
    refreshCart();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshCart();
    });

    return () => subscription.unsubscribe();
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
