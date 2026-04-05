#!/usr/bin/env bash
# ============================================================
#  SITE AUDIT SCRIPT — Full Codebase Irregularity Detector
#  Run: bash site_audit.sh /path/to/your/project
# ============================================================

PROJECT="${1:-.}"
REPORT="audit_report_$(date +%Y%m%d_%H%M%S).txt"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "$1" | tee -a "$REPORT"; }
err()  { log "${RED}[ERROR]${NC}   $1"; ((ERRORS++)); }
warn() { log "${YELLOW}[WARN]${NC}    $1"; ((WARNINGS++)); }
info() { log "${CYAN}[INFO]${NC}    $1"; }
ok()   { log "${GREEN}[OK]${NC}      $1"; }

log "============================================================"
log " SITE AUDIT REPORT — $(date)"
log " Project Root: $PROJECT"
log "============================================================"
log ""

# ── 1. BROKEN IMAGE REFERENCES ─────────────────────────────────
log "\n━━━ [1] BROKEN IMAGE REFERENCES ━━━━━━━━━━━━━━━━━━━━━━━━"
while IFS= read -r file; do
  # Extract src="..." or url(...) references
  grep -oP '(src|url)\s*[=:(]\s*["\047]?\K[^")\047\s>]+\.(png|jpg|jpeg|gif|svg|webp)' "$file" 2>/dev/null | while read -r img; do
    # Resolve relative to project root
    img_clean="${img%%\?*}"  # strip query strings
    img_path="$PROJECT/$img_clean"
    [[ "$img_clean" =~ ^https?:// ]] && continue
    [[ "$img_clean" =~ ^\{\{ ]] && continue  # skip template vars
    if [[ ! -f "$img_path" ]]; then
      err "Missing image '$img_clean' referenced in: $file"
    fi
  done
done < <(find "$PROJECT" -type f \( -name "*.html" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.css" \) \
         ! -path "*/node_modules/*" ! -path "*/.git/*")

# ── 2. MISSING BUY NOW / ADD TO CART BUTTONS ───────────────────
log "\n━━━ [2] PRODUCT PAGES — MISSING BUY/CART BUTTONS ━━━━━━━"
product_pages=$(grep -rl "product\|shop\|store\|item\|price\|₹\|\$\|price" "$PROJECT" \
  --include="*.html" --include="*.jsx" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.git -l 2>/dev/null)

for file in $product_pages; do
  has_buy=$(grep -iE "buy.?now|add.?to.?cart|checkout|purchase|order.?now|buy.?button" "$file" 2>/dev/null)
  if [[ -z "$has_buy" ]]; then
    err "Product page MISSING buy/cart action: $file"
  else
    ok "Buy action found in: $file"
  fi
done

# ── 3. COLOUR / THEME INCONSISTENCIES ──────────────────────────
log "\n━━━ [3] COLOUR & THEME INCONSISTENCIES ━━━━━━━━━━━━━━━━━"
# Look for hardcoded hex/rgb colours outside design-system files
while IFS= read -r file; do
  count=$(grep -oE '#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)' "$file" 2>/dev/null | \
          grep -v "^#fff\|^#000\|^#ffffff\|^#000000" | wc -l)
  if (( count > 10 )); then
    warn "Many hardcoded colours ($count) in: $file — consider using CSS variables"
  fi
done < <(find "$PROJECT" -type f \( -name "*.css" -o -name "*.scss" -o -name "*.jsx" -o -name "*.tsx" \) \
         ! -path "*/node_modules/*" ! -path "*/.git/*")

# Check for duplicate/conflicting theme colour definitions
theme_files=$(find "$PROJECT" \( -name "theme*" -o -name "colors*" -o -name "variables*" -o -name "tokens*" \) \
              ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null)
theme_count=$(echo "$theme_files" | grep -c . 2>/dev/null || echo 0)
if (( theme_count > 1 )); then
  warn "Multiple theme/colour files found ($theme_count) — possible conflicts:"
  echo "$theme_files" | while read -r f; do warn "  → $f"; done
fi

# ── 4. BROKEN LINKS & ROUTES ───────────────────────────────────
log "\n━━━ [4] BROKEN INTERNAL ROUTES / LINKS ━━━━━━━━━━━━━━━━━"
# Look for href links that point to files that don't exist
while IFS= read -r file; do
  grep -oP 'href=["'"'"']\K[^"'"'"'#?]+' "$file" 2>/dev/null | grep -v "^https\?://" | while read -r link; do
    [[ -z "$link" || "$link" == "/" || "$link" =~ ^\{\{ ]] && continue
    target="$PROJECT/$link"
    # Try with and without index.html
    if [[ ! -f "$target" && ! -f "${target}/index.html" && ! -f "${target}.html" ]]; then
      warn "Possibly broken link '$link' in: $file"
    fi
  done
done < <(find "$PROJECT" -name "*.html" ! -path "*/node_modules/*" ! -path "*/.git/*")

# ── 5. MISSING ALT TEXT ON IMAGES ──────────────────────────────
log "\n━━━ [5] ACCESSIBILITY — MISSING ALT TEXT ━━━━━━━━━━━━━━━"
while IFS= read -r file; do
  bad=$(grep -oE '<img[^>]*>' "$file" 2>/dev/null | grep -v 'alt=' | grep -v 'alt=""' )
  if [[ -n "$bad" ]]; then
    count=$(echo "$bad" | wc -l)
    err "$count <img> tag(s) missing alt attribute in: $file"
  fi
done < <(find "$PROJECT" -name "*.html" ! -path "*/node_modules/*")

# ── 6. CONSOLE ERRORS — UNDEFINED VARIABLES ────────────────────
log "\n━━━ [6] JS — UNDEFINED / UNDECLARED USAGE ━━━━━━━━━━━━━━"
while IFS= read -r file; do
  # Look for common undefined-var patterns
  grep -nE "\bundefined\b|\bNaN\b|console\.error|throw new Error" "$file" 2>/dev/null | head -5 | while read -r line; do
    warn "Potential runtime issue in $file → $line"
  done
done < <(find "$PROJECT" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \
         ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | head -30)

# ── 7. MISSING ENV VARIABLES ───────────────────────────────────
log "\n━━━ [7] ENVIRONMENT CONFIG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
env_sample=$(find "$PROJECT" -maxdepth 2 -name ".env.example" -o -name ".env.sample" 2>/dev/null | head -1)
env_actual=$(find "$PROJECT" -maxdepth 2 -name ".env" 2>/dev/null | head -1)

if [[ -n "$env_sample" && -z "$env_actual" ]]; then
  err ".env file missing! Found .env.example but no .env — app will fail to start"
fi

if [[ -n "$env_actual" ]]; then
  grep -oP '^\K[A-Z_]+(?==)' "$env_actual" 2>/dev/null | while read -r key; do
    val=$(grep "^$key=" "$env_actual" | cut -d= -f2)
    if [[ -z "$val" ]]; then
      warn "Empty env variable: $key"
    fi
  done
fi

# ── 8. MIXED HTTP/HTTPS (INSECURE CONTENT) ─────────────────────
log "\n━━━ [8] MIXED CONTENT — HTTP LINKS IN HTTPS SITE ━━━━━━━"
while IFS= read -r file; do
  matches=$(grep -nE 'http://(?!localhost|127\.0\.0\.1)' "$file" 2>/dev/null | head -3)
  if [[ -n "$matches" ]]; then
    warn "Insecure http:// reference in $file:"
    echo "$matches" | while read -r m; do warn "  → $m"; done
  fi
done < <(find "$PROJECT" -type f \( -name "*.html" -o -name "*.js" -o -name "*.jsx" -o -name "*.tsx" \) \
         ! -path "*/node_modules/*" ! -path "*/.git/*")

# ── 9. LARGE UNOPTIMISED IMAGES ────────────────────────────────
log "\n━━━ [9] OVERSIZED / UNOPTIMISED IMAGES ━━━━━━━━━━━━━━━━━"
find "$PROJECT" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | while read -r img; do
  size_kb=$(du -k "$img" | cut -f1)
  if (( size_kb > 500 )); then
    warn "Large image (${size_kb}KB): $img — consider compressing"
  fi
done

# ── 10. CSS SYNTAX ERRORS ──────────────────────────────────────
log "\n━━━ [10] CSS SYNTAX CHECKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v npx &>/dev/null; then
  while IFS= read -r cssfile; do
    result=$(npx --yes stylelint "$cssfile" 2>&1 | head -5)
    if [[ -n "$result" ]]; then
      err "CSS issues in $cssfile:"
      echo "$result" | while read -r r; do warn "  → $r"; done
    fi
  done < <(find "$PROJECT" -name "*.css" ! -path "*/node_modules/*" | head -10)
else
  info "npx not found — skipping CSS lint (install Node.js to enable)"
fi

# ── 11. DUPLICATE CSS CLASS NAMES ──────────────────────────────
log "\n━━━ [11] DUPLICATE CSS CLASS DEFINITIONS ━━━━━━━━━━━━━━━"
while IFS= read -r cssfile; do
  dupes=$(grep -oP '^\.[a-zA-Z][a-zA-Z0-9_-]+' "$cssfile" 2>/dev/null | sort | uniq -d)
  if [[ -n "$dupes" ]]; then
    warn "Duplicate CSS classes in $cssfile: $dupes"
  fi
done < <(find "$PROJECT" -name "*.css" ! -path "*/node_modules/*")

# ── 12. MISSING FONT IMPORTS ───────────────────────────────────
log "\n━━━ [12] FONT REFERENCES WITHOUT IMPORTS ━━━━━━━━━━━━━━━"
used_fonts=$(grep -roh "font-family:[^;}\n]*" "$PROJECT" --include="*.css" --include="*.scss" \
             --exclude-dir=node_modules 2>/dev/null | sort -u)
imported_fonts=$(grep -roh "@import.*google.*fonts\|@font-face\|fonts.googleapis" "$PROJECT" \
                 --include="*.css" --include="*.html" --exclude-dir=node_modules 2>/dev/null)

if [[ -n "$used_fonts" && -z "$imported_fonts" ]]; then
  warn "Custom fonts used in CSS but no @font-face or Google Fonts @import found"
fi

# ── SUMMARY ────────────────────────────────────────────────────
log ""
log "============================================================"
log " AUDIT COMPLETE"
log "  ${RED}Errors:${NC}   $ERRORS"
log "  ${YELLOW}Warnings:${NC} $WARNINGS"
log "  Report saved to: $REPORT"
log "============================================================"