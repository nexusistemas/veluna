import type {
  Category,
  Product,
  ProductImage,
  ProductKit,
  ProductVariant,
} from '../types/database';

export interface ProductWithRelations extends Product {
  category: Pick<Category, 'id' | 'name'> | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
}

export interface ProductFullAdmin extends Product {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  product_kits: ProductKit[];
}

export interface ProductSummaryOption {
  id: string;
  name: string;
  brand: string | null;
  cover_url: string | null;
}

export interface ProductImageDraft {
  id?: string;
  image_url: string;
}

export interface ProductVariantDraft {
  id?: string;
  name: string;
  color_name: string;
  color_hex: string | null;
  size_label: string;
  ean_barcode: string;
  sku: string;
  cost_price: number | null;
  price: number;
  promo_price: number | null;
  stock_qty: number;
  batch_expiry_date: string | null;
  variant_image_url: string | null;
  is_active: boolean;
}

export interface ProductKitDraft {
  suggested_product_id: string;
  discount_percent: number;
}

export interface SaveProductFullInput {
  id?: string;
  name: string;
  category_id: string | null;
  brand: string;
  description: string;
  is_featured: boolean;
  is_flash_sale: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  images: ProductImageDraft[];
  variants: ProductVariantDraft[];
  kits: ProductKitDraft[];
}
