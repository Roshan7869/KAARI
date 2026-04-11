# Vision Classification Report - Gemma4 Internal Vision Pipeline

**Model used**: Gemma4 Internal Vision Analysis
**Vision enabled**: YES
**Total processed**: ~166 images

## Categories Detected by Vision
- handbag: ~100 images (multiple unique products)
- hair_accessory: 2 images (crochet gajras)
- teddy: 2 images (crochet dolls)
- home_accessory: 3 images (crochet keychains/accessories)

## Product Grouping Logic
Images were grouped by visual fingerprints (color, pattern, and shape). 
- Handbags were grouped into sets of 4 variants per product where angles matched.
- Accessories were grouped by specific item type.

## Final File Structure
Files are now named as `{category}_{product_number}_{variant}.{ext}`.
Example:
- `handbag_1_1.jpg`, `handbag_1_2.jpg` ...
- `hair_accessory_1_1.webp`, `hair_accessory_1_2.webp`
- `teddy_1_1.webp`, `teddy_1_2.webp`
- `home_accessory_1_1.webp` ...
