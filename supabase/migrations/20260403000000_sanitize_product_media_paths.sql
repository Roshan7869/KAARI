-- ============================================================
-- Migration: Sanitize CRLF from product_media.file_path
-- Date: 2026-04-03
-- Reason: Boho Sunburst Handbag image URL contains %0D%0A
--         causing broken image loads on product pages.
-- ============================================================

-- Step 1: Clean existing CRLF, CR, LF, and tab chars from all file_path values
UPDATE product_media
SET file_path = trim(
  regexp_replace(
    file_path,
    '[\r\n\t]+',
    '',
    'g'
  )
)
WHERE file_path ~ '[\r\n\t]';

-- Step 2: Add DB-level constraint to prevent future CRLF insertion
ALTER TABLE product_media
ADD CONSTRAINT no_crlf_in_file_path
CHECK (
  file_path NOT LIKE '%' || chr(13) || '%'
  AND file_path NOT LIKE '%' || chr(10) || '%'
  AND file_path NOT LIKE '%' || chr(9) || '%'
);

-- Verify: this should return 0 after migration runs
-- SELECT COUNT(*) FROM product_media WHERE file_path ~ '[\r\n\t]';
