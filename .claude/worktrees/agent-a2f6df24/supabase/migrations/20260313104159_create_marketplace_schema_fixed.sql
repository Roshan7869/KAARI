/*
  # Kaari Handmade Marketplace Schema
  
  ## New Tables Created
  
  ### Core User & Vendor
  - `vendors` - Vendor/seller shops with status management
  - `user_roles` - Role management (already exists)
  
  ### Product Catalog
  - Products table updates for marketplace
  - Product variants, media updates
  
  ### Cart & Customization
  - `cart_item_customizations` - Per-item customization requests
  - `customization_uploads` - File references for custom requests
  
  ### Checkout & Orders
  - `order_status_events` - Status change timeline
  
  ## Security
  - Enable RLS on all tables
  - Customer can only access their own data
  - Vendors can access their own products and orders
  - Admin can access everything
*/

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  status text CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Update products table structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE products ADD COLUMN vendor_id uuid REFERENCES vendors(id);
  END IF;
END $$;

-- Update product_variants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_variants' AND column_name = 'production_days'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN production_days int DEFAULT 7;
  END IF;
END $$;

-- Update cart_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'item_type'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN item_type text CHECK (
      item_type IN ('standard', 'customized')
    ) DEFAULT 'standard';
  END IF;
END $$;

-- Update orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN vendor_id uuid REFERENCES vendors(id);
  END IF;
  
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'placed', 'awaiting_review', 'quote_pending', 'payment_pending',
      'paid', 'in_production', 'ready_to_ship', 'shipped',
      'delivered', 'cancelled', 'refunded'
    )
  );
END $$;

-- Enable RLS on all tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_item_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
DROP POLICY IF EXISTS "Vendors viewable by owner and admin" ON vendors;
CREATE POLICY "Vendors viewable by owner and admin"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Vendors updatable by owner and admin" ON vendors;
CREATE POLICY "Vendors updatable by owner and admin"
  ON vendors FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    owner_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for cart_item_customizations
DROP POLICY IF EXISTS "Users can view own cart customizations" ON cart_item_customizations;
CREATE POLICY "Users can view own cart customizations"
  ON cart_item_customizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = cart_item_customizations.cart_item_id
      AND c.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert own cart customizations" ON cart_item_customizations;
CREATE POLICY "Users can insert own cart customizations"
  ON cart_item_customizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = cart_item_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own cart customizations" ON cart_item_customizations;
CREATE POLICY "Users can update own cart customizations"
  ON cart_item_customizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = cart_item_customizations.cart_item_id
      AND c.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cart_items ci
      JOIN carts c ON ci.cart_id = c.id
      WHERE ci.id = cart_item_customizations.cart_item_id
      AND c.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for customization_uploads
DROP POLICY IF EXISTS "Users can view own customization uploads" ON customization_uploads;
CREATE POLICY "Users can view own customization uploads"
  ON customization_uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_item_customizations cic
      JOIN cart_items ci ON cic.cart_item_id = ci.id
      JOIN carts c ON ci.cart_id = c.id
      WHERE cic.id = customization_uploads.cart_item_customization_id
      AND c.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can insert own customization uploads" ON customization_uploads;
CREATE POLICY "Users can insert own customization uploads"
  ON customization_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cart_item_customizations cic
      JOIN cart_items ci ON cic.cart_item_id = ci.id
      JOIN carts c ON ci.cart_id = c.id
      WHERE cic.id = cart_item_customization_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for order_status_events
DROP POLICY IF EXISTS "Users can view their order status events" ON order_status_events;
CREATE POLICY "Users can view their order status events"
  ON order_status_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_events.order_id
      AND orders.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can insert order status events" ON order_status_events;
CREATE POLICY "Admin can insert order status events"
  ON order_status_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_owner ON vendors(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cart_customizations_item ON cart_item_customizations(cart_item_id);
CREATE INDEX IF NOT EXISTS idx_customization_uploads_customization ON customization_uploads(cart_item_customization_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_status_events(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- Drop and recreate order number generation function
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
CREATE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_number text;
  year_part text;
  sequence_part text;
BEGIN
  year_part := to_char(now(), 'YY');
  
  SELECT LPAD((COALESCE(COUNT(*), 0) + 1)::text, 6, '0')
  INTO sequence_part
  FROM orders
  WHERE order_number LIKE 'KH' || year_part || '%';
  
  new_number := 'KH' || year_part || sequence_part;
  
  RETURN new_number;
END;
$$;

-- Trigger function to auto-generate order numbers
DROP FUNCTION IF EXISTS set_order_number() CASCADE;
CREATE FUNCTION set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Function to log status changes
DROP FUNCTION IF EXISTS log_order_status_change() CASCADE;
CREATE FUNCTION log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_events (
      order_id,
      old_status,
      new_status,
      actor_user_id
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_order_status ON orders;
CREATE TRIGGER trigger_log_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();