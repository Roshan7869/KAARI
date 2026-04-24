export interface ProductMedia {
  file_path: string;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  size: string | null;
  color: string | null;
  stock_qty: number;
  price: number | null;
  is_default: boolean;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  compare_at_price: number | null;
  category: string | null;
  allow_customization: boolean;
  is_active: boolean;
  average_rating: number | null;
  review_count: number | null;
  sold_count: number | null;
  season_tag: string | null;
  product_type: string | null;
  color_options: ColorOption[] | null;
  created_at: string;
}
