export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Helper type to ensure the public schema is properly typed
type EnsurePublicSchema<T> = T extends { public?: any } ? T : { public: T }

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string
          user_id: string
          label: string
          full_name: string
          phone: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          postal_code: string
          country: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label?: string
          full_name: string
          phone: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          postal_code: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          full_name?: string
          phone?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          postal_code?: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billboard_products: {
        Row: {
          id: string
          product_id: string
          display_order: number
          tag: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          display_order?: number
          tag?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          display_order?: number
          tag?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billboard_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_item_customizations: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          cart_item_id: string
          customization_message: string
          delivery_deadline: string | null
          id: string
          preferred_color: string | null
          preferred_material: string | null
          preferred_size: string | null
          quote_status: string
          requires_manual_review: boolean
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          cart_item_id: string
          customization_message: string
          delivery_deadline?: string | null
          id?: string
          preferred_color?: string | null
          preferred_material?: string | null
          preferred_size?: string | null
          quote_status?: string
          requires_manual_review?: boolean
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          cart_item_id?: string
          customization_message?: string
          delivery_deadline?: string | null
          id?: string
          preferred_color?: string | null
          preferred_material?: string | null
          preferred_size?: string | null
          quote_status?: string
          requires_manual_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cart_item_customizations_cart_item_id_fkey"
            columns: ["cart_item_id"]
            isOneToOne: true
            referencedRelation: "cart_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          item_type: string
          line_total: number
          product_id: string
          quantity: number
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          item_type?: string
          line_total: number
          product_id: string
          quantity?: number
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          item_type?: string
          line_total?: number
          product_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          cart_id: string
          city: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          payment_method: string | null
          phone: string | null
          postal_code: string | null
          shipping_amount: number | null
          shipping_line1: string | null
          shipping_line2: string | null
          shipping_method: string | null
          shipping_name: string | null
          state: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          cart_id: string
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          payment_method?: string | null
          phone?: string | null
          postal_code?: string | null
          shipping_amount?: number | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_method?: string | null
          shipping_name?: string | null
          state?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          cart_id?: string
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          payment_method?: string | null
          phone?: string | null
          postal_code?: string | null
          shipping_amount?: number | null
          shipping_line1?: string | null
          shipping_line2?: string | null
          shipping_method?: string | null
          shipping_name?: string | null
          state?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customization_uploads: {
        Row: {
          cart_item_customization_id: string
          created_at: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
        }
        Insert: {
          cart_item_customization_id: string
          created_at?: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
        }
        Update: {
          cart_item_customization_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customization_uploads_cart_item_customization_id_fkey"
            columns: ["cart_item_customization_id"]
            isOneToOne: false
            referencedRelation: "cart_item_customizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          customization_snapshot: Json | null
          id: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          customization_snapshot?: Json | null
          id?: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          customization_snapshot?: Json | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_session_id: string | null
          created_at: string
          fulfillment_type: string | null
          id: string
          order_number: string | null
          payment_status: string | null
          shipping_amount: number | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          checkout_session_id?: string | null
          created_at?: string
          fulfillment_type?: string | null
          id?: string
          order_number?: string | null
          payment_status?: string | null
          shipping_amount?: number | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          checkout_session_id?: string | null
          created_at?: string
          fulfillment_type?: string | null
          id?: string
          order_number?: string | null
          payment_status?: string | null
          shipping_amount?: number | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string
          provider_payment_id: string | null
          status: 'created' | 'completed' | 'failed' | 'refunded' | 'cancelled'
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider: string
          provider_payment_id?: string | null
          status?: 'created' | 'completed' | 'failed' | 'refunded' | 'cancelled'
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: 'created' | 'completed' | 'failed' | 'refunded' | 'cancelled'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          file_path: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          file_path: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          file_path?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          id: string
          is_default: boolean
          material: string | null
          price: number | null
          product_id: string
          production_days: number | null
          size: string | null
          sku: string | null
          stock_qty: number
        }
        Insert: {
          color?: string | null
          id?: string
          is_default?: boolean
          material?: string | null
          price?: number | null
          product_id: string
          production_days?: number | null
          size?: string | null
          sku?: string | null
          stock_qty?: number
        }
        Update: {
          color?: string | null
          id?: string
          is_default?: boolean
          material?: string | null
          price?: number | null
          product_id?: string
          production_days?: number | null
          size?: string | null
          sku?: string | null
          stock_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_customization: boolean
          average_rating: number | null
          base_price: number
          category: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          product_type: string
          review_count: number
          season_tag: string | null
          slug: string
          sold_count: number
          title: string
          updated_at: string
        }
        Insert: {
          allow_customization?: boolean
          average_rating?: number | null
          base_price: number
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          product_type: string
          review_count?: number
          season_tag?: string | null
          slug: string
          sold_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          allow_customization?: boolean
          average_rating?: number | null
          base_price?: number
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          product_type?: string
          review_count?: number
          season_tag?: string | null
          slug?: string
          sold_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          content: string | null
          created_at: string
          deleted_at: string | null
          helpful_count: number
          id: string
          is_verified_purchase: boolean
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_visibility: {
        Row: {
          id: string
          review_id: string
          product_id: string
          is_visible: boolean
          display_priority: number
          placement_type: string
          admin_notes: string | null
          visibility_set_by: string | null
          visibility_updated_at: string
          last_modified_by: string | null
          last_modified_at: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          product_id: string
          is_visible?: boolean
          display_priority?: number
          placement_type?: string
          admin_notes?: string | null
          visibility_set_by?: string | null
          visibility_updated_at?: string
          last_modified_by?: string | null
          last_modified_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          product_id?: string
          is_visible?: boolean
          display_priority?: number
          placement_type?: string
          admin_notes?: string | null
          visibility_set_by?: string | null
          visibility_updated_at?: string
          last_modified_by?: string | null
          last_modified_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_visibility_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_visibility_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      review_visibility_audit: {
        Row: {
          id: string
          review_id: string
          admin_id: string
          action: string
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          admin_id: string
          action: string
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          admin_id?: string
          action?: string
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_visibility_audit_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_visibility_audit_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email_notifications_enabled: boolean | null
          full_name: string | null
          id: string
          phone: string | null
          sms_notifications_enabled: boolean | null
          marketing_emails_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id: string
          phone?: string | null
          sms_notifications_enabled?: boolean | null
          marketing_emails_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          sms_notifications_enabled?: boolean | null
          marketing_emails_enabled?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          resource_type: string
          resource_id: string | null
          changes_before: Record<string, unknown> | null
          changes_after: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          changes_before?: Record<string, unknown> | null
          changes_after?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          changes_before?: Record<string, unknown> | null
          changes_after?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          id: string
          event_type: string
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          details: Record<string, unknown> | null
          severity: string
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Record<string, unknown> | null
          severity?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Record<string, unknown> | null
          severity?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_entries: {
        Row: {
          id: string
          identifier: string
          action_type: string
          attempt_count: number
          first_attempt: string
          blocked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          identifier: string
          action_type: string
          attempt_count?: number
          first_attempt?: string
          blocked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          identifier?: string
          action_type?: string
          attempt_count?: number
          first_attempt?: string
          blocked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          id: string
          session_id: string
          order_id: string
          user_id: string
          amount: number
          currency: string
          payment_method: string
          status: string
          created_at: string
          expires_at: string
          completed_at: string | null
          transaction_id: string | null
          metadata: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          session_id: string
          order_id: string
          user_id: string
          amount: number
          currency?: string
          payment_method: string
          status?: string
          created_at?: string
          expires_at: string
          completed_at?: string | null
          transaction_id?: string | null
          metadata?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          session_id?: string
          order_id?: string
          user_id?: string
          amount?: number
          currency?: string
          payment_method?: string
          status?: string
          created_at?: string
          expires_at?: string
          completed_at?: string | null
          transaction_id?: string | null
          metadata?: Record<string, unknown> | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_gateways: {
        Row: {
          id: string
          provider: string
          is_active: boolean
          is_test_mode: boolean
          api_key: string | null
          api_secret: string | null
          webhook_secret: string | null
          config: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: string
          is_active?: boolean
          is_test_mode?: boolean
          api_key?: string | null
          api_secret?: string | null
          webhook_secret?: string | null
          config?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          is_active?: boolean
          is_test_mode?: boolean
          api_key?: string | null
          api_secret?: string | null
          webhook_secret?: string | null
          config?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cashfree_sessions: {
        Row: {
          id: string
          order_id: string
          checkout_session_id: string | null
          cf_order_id: string | null
          cf_payment_session_id: string | null
          cf_payment_id: string | null
          amount: number
          currency: string
          payment_method: string | null
          status: string
          customer_email: string | null
          customer_phone: string | null
          customer_name: string | null
          return_url: string | null
          notify_url: string | null
          created_at: string
          updated_at: string
          expires_at: string
          paid_at: string | null
          raw_response: Record<string, unknown> | null
        }
        Insert: {
          id?: string
          order_id: string
          checkout_session_id?: string | null
          cf_order_id?: string | null
          cf_payment_session_id?: string | null
          cf_payment_id?: string | null
          amount: number
          currency?: string
          payment_method?: string | null
          status?: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_name?: string | null
          return_url?: string | null
          notify_url?: string | null
          created_at?: string
          updated_at?: string
          expires_at?: string
          paid_at?: string | null
          raw_response?: Record<string, unknown> | null
        }
        Update: {
          id?: string
          order_id?: string
          checkout_session_id?: string | null
          cf_order_id?: string | null
          cf_payment_session_id?: string | null
          cf_payment_id?: string | null
          amount?: number
          currency?: string
          payment_method?: string | null
          status?: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_name?: string | null
          return_url?: string | null
          notify_url?: string | null
          created_at?: string
          updated_at?: string
          expires_at?: string
          paid_at?: string | null
          raw_response?: Record<string, unknown> | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          type: string
          channel: string
          status: string
          recipient: string
          subject: string | null
          content: string
          metadata: Record<string, unknown> | null
          provider_response: Record<string, unknown> | null
          error_message: string | null
          sent_at: string | null
          delivered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id?: string | null
          type: string
          channel: string
          status?: string
          recipient: string
          subject?: string | null
          content: string
          metadata?: Record<string, unknown> | null
          provider_response?: Record<string, unknown> | null
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_id?: string | null
          type?: string
          channel?: string
          status?: string
          recipient?: string
          subject?: string | null
          content?: string
          metadata?: Record<string, unknown> | null
          provider_response?: Record<string, unknown> | null
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_templates: {
        Row: {
          id: string
          name: string
          type: string
          channel: string
          subject: string | null
          template: string
          variables: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          channel: string
          subject?: string | null
          template: string
          variables?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          channel?: string
          subject?: string | null
          template?: string
          variables?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_from_cart: {
        Args: {
          p_cart_id: string
          p_payment_method: string
          p_email?: string | null
          p_phone?: string | null
          p_shipping_name?: string | null
          p_shipping_line1?: string | null
          p_shipping_line2?: string | null
          p_city?: string | null
          p_state?: string | null
          p_postal_code?: string | null
          p_country?: string | null
        }
        Returns: Json
      }
      create_payment_session: {
        Args: {
          p_order_id: string
          p_user_id: string
          p_amount: number
          p_payment_method: string
          p_expires_in_minutes?: number
        }
        Returns: {
          session_id: string
          order_id: string
          amount: number
          currency: string
          expires_at: string
        }[]
      }
      verify_payment_session: {
        Args: {
          p_session_id: string
          p_user_id?: string | null
        }
        Returns: {
          valid: boolean
          session_id: string
          order_id: string
          amount: number
          status: string
          error: string | null
        }[]
      }
      complete_payment_session: {
        Args: {
          p_session_id: string
          p_transaction_id: string
          p_status: string
        }
        Returns: {
          success: boolean
          order_id: string
          message: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      queue_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_channel: string
          p_recipient: string
          p_subject: string | null
          p_content: string
          p_order_id?: string | null
          p_metadata?: Json | null
        }
        Returns: string
      }
      mark_notification_sent: {
        Args: {
          p_notification_id: string
          p_provider_response?: Json | null
        }
        Returns: void
      }
    }
    Enums: {
      app_role: "customer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

// Use the explicit table name as the constraint instead of keyof DefaultSchema["Tables"]
// This helps TypeScript infer the type better
export type Tables<
  TableName extends string = keyof DefaultSchema["Tables"],
> = TableName extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][TableName] extends { Row: infer R } ? R : never
  : never

export type TablesInsert<
  TableName extends string = keyof DefaultSchema["Tables"],
> = TableName extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][TableName] extends { Insert: infer I } ? I : never
  : never

export type TablesUpdate<
  TableName extends string = keyof DefaultSchema["Tables"],
> = TableName extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][TableName] extends { Update: infer U } ? U : never
  : never

export type Enums<
  EnumName extends keyof DefaultSchema["Enums"] = keyof DefaultSchema["Enums"],
> = DefaultSchema["Enums"][EnumName]