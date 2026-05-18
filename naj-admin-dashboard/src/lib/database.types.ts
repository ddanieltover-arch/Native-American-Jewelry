// ═══════════════════════════════════════════════════════════
// Supabase Database Types
// Regenerate via: npx supabase gen types typescript --project-id YOUR_ID
// ═══════════════════════════════════════════════════════════

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id:          string;
          name:        string;
          slug:        string;
          parent_id:   string | null;
          description: string | null;
          banner_url:  string | null;
          featured:    boolean;
          sort_order:  number;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'> & Partial<Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      products: {
        Row: {
          id:              string;
          name:            string;
          slug:            string;
          description:     string | null;
          category_id:     string | null;
          source_price:    number;
          price:           number;
          sku:             string | null;
          tags:            string[];
          in_stock:        boolean;
          stock_quantity:  number;
          status:          'pending' | 'active' | 'archived';
          source_url:      string | null;
          approved_by:     string | null;
          approved_at:     string | null;
          seo_title:       string | null;
          seo_description: string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & Partial<Pick<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_variants: {
        Row: {
          id:             string;
          product_id:     string;
          name:           string;
          value:          string;
          price_modifier: number;
          stock_quantity: number;
          sku:            string | null;
          created_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['product_variants']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
      };
      product_images: {
        Row: {
          id:         string;
          product_id: string;
          url:        string;
          alt:        string | null;
          is_primary: boolean;
          position:   number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_images']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
      };
      orders: {
        Row: {
          id:               string;
          order_number:     string;
          customer_id:      string | null;
          status:           'awaiting_payment' | 'payment_uploaded' | 'payment_confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal:         number;
          shipping_cost:    number;
          discount_amount:  number;
          total:            number;
          shipping_method:  string | null;
          shipping_address: Json;
          coupon_code:      string | null;
          notes:            string | null;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id:           string;
          order_id:     string;
          product_id:   string | null;
          product_name: string;
          variant_id:   string | null;
          quantity:     number;
          unit_price:   number;
          subtotal:     number;
          created_at:   string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      payments: {
        Row: {
          id:               string;
          order_id:         string;
          method:           'chime' | 'cashapp' | 'apple_cash' | 'zelle' | 'bank_transfer';
          status:           'pending' | 'uploaded' | 'confirmed' | 'failed' | 'refunded';
          amount:           number;
          proof_url:        string | null;
          transaction_note: string | null;
          transaction_ref:  string | null;
          verified_by:      string | null;
          verified_at:      string | null;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      customers: {
        Row: {
          id:          string;
          email:       string;
          first_name:  string | null;
          last_name:   string | null;
          phone:       string | null;
          wishlist:    string[];
          blacklisted: boolean;
          notes:       string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      shipping_rates: {
        Row: {
          id:             string;
          zone:           'usa' | 'international';
          method:         'standard' | 'express';
          label:          string;
          rate:           number;
          free_threshold: number | null;
          est_days_min:   number | null;
          est_days_max:   number | null;
          active:         boolean;
          created_at:     string;
          updated_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['shipping_rates']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['shipping_rates']['Insert']>;
      };
      coupons: {
        Row: {
          id:            string;
          code:          string;
          type:          'percent' | 'flat';
          value:         number;
          min_order:     number;
          max_uses:      number | null;
          used_count:    number;
          applicable_to: 'all' | 'category' | 'product';
          applicable_id: string | null;
          expires_at:    string | null;
          active:        boolean;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database['public']['Tables']['coupons']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
      };
      scrape_logs: {
        Row: {
          id:                string;
          job_id:            string;
          target_url:        string | null;
          status:            'running' | 'completed' | 'failed' | 'partial';
          products_found:    number;
          products_filtered: number;
          products_imported: number;
          errors:            Json | null;
          duration_ms:       number | null;
          started_at:        string;
          completed_at:      string | null;
        };
        Insert: Omit<Database['public']['Tables']['scrape_logs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['scrape_logs']['Insert']>;
      };
      admin_users: {
        Row: {
          id:            string;
          email:         string;
          role:          'super_admin' | 'admin' | 'editor' | 'support' | 'analyst';
          totp_secret:   string | null;
          totp_enabled:  boolean;
          last_login_at: string | null;
          last_login_ip: string | null;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>;
      };
      notifications: {
        Row: {
          id:               string;
          text_template:    string;
          active:           boolean;
          interval_min_sec: number;
          interval_max_sec: number;
          created_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      testimonials: {
        Row: {
          id:            string;
          customer_name: string;
          content:       string;
          rating:        number | null;
          product_id:    string | null;
          photo_url:     string | null;
          approved:      boolean;
          created_at:    string;
        };
        Insert: Omit<Database['public']['Tables']['testimonials']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['testimonials']['Insert']>;
      };
    };
    Views:   Record<string, never>;
    Functions: Record<string, never>;
    Enums:   Record<string, never>;
  };
}

// ─── Convenience row types ────────────────────────────────
export type ProductRow       = Database['public']['Tables']['products']['Row'];
export type CategoryRow      = Database['public']['Tables']['categories']['Row'];
export type OrderRow         = Database['public']['Tables']['orders']['Row'];
export type PaymentRow       = Database['public']['Tables']['payments']['Row'];
export type CustomerRow      = Database['public']['Tables']['customers']['Row'];
export type ShippingRateRow  = Database['public']['Tables']['shipping_rates']['Row'];
export type CouponRow        = Database['public']['Tables']['coupons']['Row'];
export type ScrapeLogRow     = Database['public']['Tables']['scrape_logs']['Row'];
export type AdminUserRow     = Database['public']['Tables']['admin_users']['Row'];
export type NotificationRow  = Database['public']['Tables']['notifications']['Row'];
export type TestimonialRow   = Database['public']['Tables']['testimonials']['Row'];
export type ProductImageRow  = Database['public']['Tables']['product_images']['Row'];
export type ProductVariantRow= Database['public']['Tables']['product_variants']['Row'];
export type OrderItemRow     = Database['public']['Tables']['order_items']['Row'];
