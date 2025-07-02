export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          updated_at?: string
        }
      }
      system_templates: {
        Row: {
          id: string
          name: string
          default_hourly_rate: number
          default_revision_limit: number
          default_extra_revision_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          default_hourly_rate: number
          default_revision_limit?: number
          default_extra_revision_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          default_hourly_rate?: number
          default_revision_limit?: number
          default_extra_revision_rate?: number
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          default_hourly_rate: number
          default_revision_limit: number
          default_extra_revision_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          default_hourly_rate: number
          default_revision_limit?: number
          default_extra_revision_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          default_hourly_rate?: number
          default_revision_limit?: number
          default_extra_revision_rate?: number
          updated_at?: string
        }
      }
      estimates: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          title: string
          subtotal: number
          total: number
          revision_limit: number
          extra_revision_rate: number
          revisions_used: number
          share_token: string
          estimated_start_date: string | null
          estimated_end_date: string | null
          estimated_duration_days: number | null
          notes: string | null
          terms_and_conditions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          title: string
          subtotal?: number
          total?: number
          revision_limit?: number
          extra_revision_rate?: number
          revisions_used?: number
          share_token?: string
          estimated_start_date?: string | null
          estimated_end_date?: string | null
          estimated_duration_days?: number | null
          notes?: string | null
          terms_and_conditions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          title?: string
          subtotal?: number
          total?: number
          revision_limit?: number
          extra_revision_rate?: number
          revisions_used?: number
          share_token?: string
          estimated_start_date?: string | null
          estimated_end_date?: string | null
          estimated_duration_days?: number | null
          notes?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
        }
      }
      line_items: {
        Row: {
          id: string
          estimate_id: string
          name: string
          hours: number
          hourly_rate: number
          memo: string | null
          amount: number
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          estimate_id: string
          name: string
          hours?: number
          hourly_rate?: number
          memo?: string | null
          amount?: number
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          estimate_id?: string
          name?: string
          hours?: number
          hourly_rate?: number
          memo?: string | null
          amount?: number
          order_index?: number
          updated_at?: string
        }
      }
      revision_logs: {
        Row: {
          id: string
          estimate_id: string
          used_number: number
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          estimate_id: string
          used_number: number
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          estimate_id?: string
          used_number?: number
          memo?: string | null
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type SystemTemplate = Database['public']['Tables']['system_templates']['Row']
export type Estimate = Database['public']['Tables']['estimates']['Row']
export type LineItem = Database['public']['Tables']['line_items']['Row']
export type RevisionLog = Database['public']['Tables']['revision_logs']['Row']

export type EstimateWithLineItems = Estimate & {
  line_items: LineItem[]
  revision_logs: RevisionLog[]
}

export type NewEstimate = Database['public']['Tables']['estimates']['Insert']
export type NewLineItem = Database['public']['Tables']['line_items']['Insert']
export type NewRevisionLog = Database['public']['Tables']['revision_logs']['Insert']