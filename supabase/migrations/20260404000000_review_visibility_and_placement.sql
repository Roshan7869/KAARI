-- Review Visibility & Placement Management System
-- Allows admin full control over which reviews are visible, where they appear, and in what order

-- ===== REVIEW VISIBILITY TABLE =====
CREATE TABLE IF NOT EXISTS public.review_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL UNIQUE REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    
    -- Core visibility control
    is_visible BOOLEAN NOT NULL DEFAULT true, -- Admin toggle: show/hide review
    display_priority INT NOT NULL DEFAULT 999, -- Lower = higher priority (featured first)
    
    -- Placement options: 'featured' (top), 'normal' (in rotation), 'hidden' (admin only)
    placement_type TEXT NOT NULL CHECK (placement_type IN ('featured', 'normal', 'hidden')) DEFAULT 'normal',
    
    -- Internal admin notes for this review's visibility
    admin_notes TEXT,
    
    -- Audit trail
    visibility_set_by UUID REFERENCES public.profiles(id),
    visibility_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_modified_by UUID REFERENCES public.profiles(id),
    last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_review_visibility_review_id 
ON public.review_visibility(review_id);

CREATE INDEX IF NOT EXISTS idx_review_visibility_product_id 
ON public.review_visibility(product_id);

CREATE INDEX IF NOT EXISTS idx_review_visibility_visible 
ON public.review_visibility(product_id, is_visible, display_priority) 
WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_review_visibility_placement 
ON public.review_visibility(product_id, placement_type, display_priority);

-- ===== REVIEW VISIBILITY AUDIT LOG =====
CREATE TABLE IF NOT EXISTS public.review_visibility_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Track what changed
    action TEXT NOT NULL CHECK (action IN ('toggle', 'reorder', 'move_product', 'note_added')),
    old_value JSONB, -- Previous state
    new_value JSONB, -- New state
    
    reason TEXT, -- Why admin made this change
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_visibility_audit_review 
ON public.review_visibility_audit(review_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_visibility_audit_admin 
ON public.review_visibility_audit(admin_id, created_at DESC);

-- ===== ENABLE RLS =====
ALTER TABLE public.review_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_visibility_audit ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR REVIEW_VISIBILITY =====

-- Admin can manage all visibility settings
CREATE POLICY "Admins can manage all review visibility"
ON public.review_visibility
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Users can view visibility settings for approved reviews only
CREATE POLICY "Users can view visibility of approved reviews"
ON public.review_visibility FOR SELECT
USING (
    -- Review must be approved and visible
    EXISTS (
        SELECT 1 FROM public.product_reviews pr
        WHERE pr.id = review_visibility.review_id
        AND pr.status = 'approved'
        AND pr.deleted_at IS NULL
        AND review_visibility.is_visible = true
    )
);

-- ===== RLS POLICIES FOR REVIEW_VISIBILITY_AUDIT =====

-- Only admins can view audit log
CREATE POLICY "Admins can view review visibility audit"
ON public.review_visibility_audit FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Only admins can insert audit log (via trigger)
CREATE POLICY "Admins can insert audit logs"
ON public.review_visibility_audit FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ===== FUNCTIONS & TRIGGERS =====

-- Function to auto-create visibility record when review is approved
CREATE OR REPLACE FUNCTION auto_create_review_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create visibility record when review is approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO public.review_visibility (
            review_id,
            product_id,
            is_visible,
            display_priority,
            placement_type,
            visibility_set_by
        )
        VALUES (
            NEW.id,
            NEW.product_id,
            true,
            999, -- Default priority (shown below featured reviews)
            'normal', -- Default placement
            auth.uid()
        )
        ON CONFLICT (review_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-create visibility when review approved
CREATE TRIGGER trigger_auto_create_review_visibility
AFTER UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION auto_create_review_visibility();

-- Function to log visibility changes to audit table
CREATE OR REPLACE FUNCTION log_review_visibility_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action TEXT;
BEGIN
    -- Determine what action was performed
    IF NEW.is_visible != OLD.is_visible THEN
        v_action := 'toggle';
    ELSIF NEW.display_priority != OLD.display_priority THEN
        v_action := 'reorder';
    ELSIF NEW.placement_type != OLD.placement_type THEN
        v_action := 'move_product';
    ELSIF NEW.admin_notes != OLD.admin_notes THEN
        v_action := 'note_added';
    ELSE
        RETURN NEW;
    END IF;
    
    -- Log to audit table
    INSERT INTO public.review_visibility_audit (
        review_id,
        admin_id,
        action,
        old_value,
        new_value,
        reason
    )
    VALUES (
        NEW.review_id,
        auth.uid(),
        v_action,
        jsonb_build_object(
            'is_visible', OLD.is_visible,
            'display_priority', OLD.display_priority,
            'placement_type', OLD.placement_type
        ),
        jsonb_build_object(
            'is_visible', NEW.is_visible,
            'display_priority', NEW.display_priority,
            'placement_type', NEW.placement_type
        ),
        NEW.admin_notes
    );
    
    NEW.last_modified_by := auth.uid();
    NEW.last_modified_at := NOW();
    
    RETURN NEW;
END;
$$;

-- Trigger to log visibility changes
CREATE TRIGGER trigger_log_review_visibility_change
BEFORE UPDATE ON public.review_visibility
FOR EACH ROW
EXECUTE FUNCTION log_review_visibility_change();

-- ===== HELPER FUNCTIONS =====

-- Function to get reviews for product (respecting visibility & admin control)
CREATE OR REPLACE FUNCTION get_product_reviews_user(
    p_product_id UUID,
    p_include_pending BOOLEAN DEFAULT false
)
RETURNS TABLE (
    review_id UUID,
    user_id UUID,
    rating INT,
    title VARCHAR,
    content TEXT,
    is_verified_purchase BOOLEAN,
    helpful_count INT,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_avatar TEXT,
    is_featured BOOLEAN,
    display_priority INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.user_id,
        pr.rating,
        pr.title,
        pr.content,
        pr.is_verified_purchase,
        pr.helpful_count,
        pr.created_at,
        p.full_name,
        p.avatar_url,
        CASE WHEN rv.placement_type = 'featured' THEN true ELSE false END,
        rv.display_priority
    FROM public.product_reviews pr
    LEFT JOIN public.profiles p ON p.id = pr.user_id
    LEFT JOIN public.review_visibility rv ON rv.review_id = pr.id
    WHERE 
        pr.product_id = p_product_id
        AND pr.deleted_at IS NULL
        AND (
            -- Public: only approved AND visible reviews
            (pr.status = 'approved' AND COALESCE(rv.is_visible, true) = true)
            OR
            -- Admin: can see pending if flag is true
            (p_include_pending = true AND pr.status = 'pending')
        )
    ORDER BY 
        rv.placement_type DESC, -- featured first
        rv.display_priority ASC, -- then by priority
        pr.created_at DESC; -- then by date
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== UPDATE PRODUCT REVIEW RLS POLICIES =====
-- Update product_reviews table to work with visibility controls

-- Drop old policy and create new one that respects visibility
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;

CREATE POLICY "Public can view approved visible reviews"
ON public.product_reviews FOR SELECT
USING (
    status = 'approved'
    AND deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.products
        WHERE id = product_reviews.product_id AND is_active = true
    )
    AND EXISTS (
        SELECT 1 FROM public.review_visibility rv
        WHERE rv.review_id = product_reviews.id
        AND rv.is_visible = true
    )
);
