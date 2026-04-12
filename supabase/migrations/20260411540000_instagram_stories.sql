-- ── Instagram Stories table ─────────────────────────────────────────
-- Admin-managed stories that appear in the Instagram feed section on
-- the homepage.  Replaces the static POSTS array in InstagramFeed.tsx.
CREATE TABLE IF NOT EXISTS instagram_stories (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url    TEXT        NOT NULL,          -- Cloudinary secure URL
  public_id    TEXT        NOT NULL,          -- Cloudinary public_id for deletion
  caption      TEXT        DEFAULT NULL,      -- Optional caption shown on hover
  link_url     TEXT        DEFAULT NULL,      -- Optional click-through URL
  position     INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE instagram_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_public_read"  ON instagram_stories;
DROP POLICY IF EXISTS "stories_admin_all"    ON instagram_stories;

-- Public can read active stories (for InstagramFeed component)
CREATE POLICY "stories_public_read"
  ON instagram_stories FOR SELECT
  TO public
  USING (is_active = true);

-- Service role (admin API) can do everything
CREATE POLICY "stories_admin_all"
  ON instagram_stories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_instagram_stories_position
  ON instagram_stories (position ASC, created_at DESC)
  WHERE is_active = true;

-- Updated-at trigger (inline function definition for portability)
CREATE OR REPLACE FUNCTION update_instagram_stories_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_instagram_stories_updated_at ON instagram_stories;
CREATE TRIGGER trg_instagram_stories_updated_at
  BEFORE UPDATE ON instagram_stories
  FOR EACH ROW EXECUTE FUNCTION update_instagram_stories_updated_at();
