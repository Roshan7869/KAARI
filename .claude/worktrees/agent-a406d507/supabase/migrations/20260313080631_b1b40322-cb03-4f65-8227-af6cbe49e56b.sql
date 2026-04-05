
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'admin');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('ready_made', 'made_to_order', 'custom_request')),
  base_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_customization BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_category ON public.products(category);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ===== PRODUCT VARIANTS =====
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  size TEXT,
  color TEXT,
  material TEXT,
  price NUMERIC(10,2),
  stock_qty INT NOT NULL DEFAULT 0,
  production_days INT,
  is_default BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_variants_product ON public.product_variants(product_id);

CREATE POLICY "Variants are publicly readable" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins can insert variants" ON public.product_variants FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update variants" ON public.product_variants FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete variants" ON public.product_variants FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ===== PRODUCT MEDIA =====
CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_media_product ON public.product_media(product_id);

CREATE POLICY "Media is publicly readable" ON public.product_media FOR SELECT USING (true);
CREATE POLICY "Admins can insert media" ON public.product_media FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update media" ON public.product_media FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete media" ON public.product_media FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ===== CARTS =====
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'converted', 'abandoned')) DEFAULT 'active',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_carts_user ON public.carts(user_id);

CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can select own carts" ON public.carts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own carts" ON public.carts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own carts" ON public.carts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own carts" ON public.carts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all carts" ON public.carts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ===== CART ITEMS =====
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('standard', 'customized')) DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can manage own cart items" ON public.cart_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Users can insert own cart items" ON public.cart_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Users can update own cart items" ON public.cart_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Users can delete own cart items" ON public.cart_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
CREATE POLICY "Admins can view all cart items" ON public.cart_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== CART ITEM CUSTOMIZATIONS =====
CREATE TABLE public.cart_item_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_item_id UUID NOT NULL UNIQUE REFERENCES public.cart_items(id) ON DELETE CASCADE,
  customization_message TEXT NOT NULL,
  preferred_size TEXT,
  preferred_color TEXT,
  preferred_material TEXT,
  delivery_deadline DATE,
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  requires_manual_review BOOLEAN NOT NULL DEFAULT true,
  quote_status TEXT NOT NULL CHECK (quote_status IN ('not_needed', 'pending', 'approved', 'rejected')) DEFAULT 'pending'
);
ALTER TABLE public.cart_item_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own customizations" ON public.cart_item_customizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id = cart_item_customizations.cart_item_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own customizations" ON public.cart_item_customizations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id = cart_item_customizations.cart_item_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own customizations" ON public.cart_item_customizations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id = cart_item_customizations.cart_item_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own customizations" ON public.cart_item_customizations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.cart_items ci
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE ci.id = cart_item_customizations.cart_item_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Admins can manage all customizations" ON public.cart_item_customizations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert customizations" ON public.cart_item_customizations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update customizations" ON public.cart_item_customizations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete customizations" ON public.cart_item_customizations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== CUSTOMIZATION UPLOADS =====
CREATE TABLE public.customization_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_item_customization_id UUID NOT NULL REFERENCES public.cart_item_customizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customization_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own uploads" ON public.customization_uploads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cart_item_customizations cic
    JOIN public.cart_items ci ON ci.id = cic.cart_item_id
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE cic.id = customization_uploads.cart_item_customization_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own uploads" ON public.customization_uploads FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cart_item_customizations cic
    JOIN public.cart_items ci ON ci.id = cic.cart_item_id
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE cic.id = customization_uploads.cart_item_customization_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own uploads" ON public.customization_uploads FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.cart_item_customizations cic
    JOIN public.cart_items ci ON ci.id = cic.cart_item_id
    JOIN public.carts c ON c.id = ci.cart_id
    WHERE cic.id = customization_uploads.cart_item_customization_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Admins can manage all uploads" ON public.customization_uploads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert uploads" ON public.customization_uploads FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete uploads" ON public.customization_uploads FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== CHECKOUT SESSIONS =====
CREATE TABLE public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  email TEXT,
  phone TEXT,
  shipping_name TEXT,
  shipping_line1 TEXT,
  shipping_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'IN',
  shipping_method TEXT,
  payment_method TEXT,
  subtotal NUMERIC(10,2),
  shipping_amount NUMERIC(10,2),
  tax_amount NUMERIC(10,2),
  total_amount NUMERIC(10,2),
  status TEXT NOT NULL CHECK (status IN ('draft', 'payment_pending', 'completed', 'failed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own checkout" ON public.checkout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkout" ON public.checkout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkout" ON public.checkout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all checkouts" ON public.checkout_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  checkout_session_id UUID REFERENCES public.checkout_sessions(id),
  order_number TEXT UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN (
      'placed', 'awaiting_review', 'quote_pending', 'payment_pending',
      'paid', 'in_production', 'ready_to_ship', 'shipped',
      'delivered', 'cancelled', 'refunded'
    )
  ) DEFAULT 'placed',
  payment_status TEXT,
  fulfillment_type TEXT CHECK (fulfillment_type IN ('standard', 'customized')),
  subtotal NUMERIC(10,2),
  shipping_amount NUMERIC(10,2),
  tax_amount NUMERIC(10,2),
  total_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can select all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert orders" ON public.orders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ===== ORDER ITEMS =====
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  customization_snapshot JSONB
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can select all order items" ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert order items" ON public.order_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== PAYMENTS =====
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')) DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can select all payments" ON public.payments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert payments" ON public.payments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== ORDER STATUS EVENTS =====
CREATE TABLE public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order events" ON public.order_status_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_status_events.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can select all order events" ON public.order_status_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert order events" ON public.order_status_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('customization-uploads', 'customization-uploads', false);

CREATE POLICY "Product media is publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'product-media');
CREATE POLICY "Admins can upload product media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product media" ON storage.objects FOR UPDATE USING (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product media" ON storage.objects FOR DELETE USING (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own customization uploads" ON storage.objects FOR SELECT
  USING (bucket_id = 'customization-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload customization files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'customization-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own customization files" ON storage.objects FOR DELETE
  USING (bucket_id = 'customization-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Order number generator
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'KR-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();
