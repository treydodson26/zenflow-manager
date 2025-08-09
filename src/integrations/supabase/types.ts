export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          booking_status: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          class_id: string
          created_at: string
          customer_id: number
          id: string
          is_waitlisted: boolean | null
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          booking_date?: string
          booking_status?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          class_id: string
          created_at?: string
          customer_id: number
          id?: string
          is_waitlisted?: boolean | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          booking_date?: string
          booking_status?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          class_id?: string
          created_at?: string
          customer_id?: number
          id?: string
          is_waitlisted?: boolean | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_engagement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "intro_offer_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_type: string
          content: string | null
          created_at: string
          id: string
          name: string
          open_rate: number
          scheduled_for: string | null
          sent_count: number
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          content?: string | null
          created_at?: string
          id?: string
          name: string
          open_rate?: number
          scheduled_for?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          content?: string | null
          created_at?: string
          id?: string
          name?: string
          open_rate?: number
          scheduled_for?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      classes_schedule: {
        Row: {
          class_date: string
          class_name: string
          class_time: string
          created_at: string | null
          current_bookings: number | null
          id: string
          instructor_name: string
          max_capacity: number | null
          needs_substitute: boolean | null
          room: string | null
          waitlist_count: number | null
        }
        Insert: {
          class_date: string
          class_name: string
          class_time: string
          created_at?: string | null
          current_bookings?: number | null
          id?: string
          instructor_name: string
          max_capacity?: number | null
          needs_substitute?: boolean | null
          room?: string | null
          waitlist_count?: number | null
        }
        Update: {
          class_date?: string
          class_name?: string
          class_time?: string
          created_at?: string | null
          current_bookings?: number | null
          id?: string
          instructor_name?: string
          max_capacity?: number | null
          needs_substitute?: boolean | null
          room?: string | null
          waitlist_count?: number | null
        }
        Relationships: []
      }
      communications_log: {
        Row: {
          content: string
          created_at: string | null
          customer_id: number
          delivered_at: string | null
          delivery_status: string | null
          email_message_id: string | null
          error_message: string | null
          id: number
          message_sequence_id: number
          message_type: string
          read_at: string | null
          recipient_email: string | null
          recipient_phone: string | null
          sent_at: string | null
          subject: string | null
          updated_at: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          customer_id: number
          delivered_at?: string | null
          delivery_status?: string | null
          email_message_id?: string | null
          error_message?: string | null
          id?: number
          message_sequence_id: number
          message_type: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          subject?: string | null
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          customer_id?: number
          delivered_at?: string | null
          delivery_status?: string | null
          email_message_id?: string | null
          error_message?: string | null
          id?: number
          message_sequence_id?: number
          message_type?: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          subject?: string | null
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_engagement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "intro_offer_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_log_message_sequence_id_fkey"
            columns: ["message_sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          failed_records: number | null
          filename: string
          id: number
          new_records: number
          processing_time_ms: number | null
          started_at: string | null
          status: string | null
          total_records: number
          updated_records: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          failed_records?: number | null
          filename: string
          id?: number
          new_records: number
          processing_time_ms?: number | null
          started_at?: string | null
          status?: string | null
          total_records: number
          updated_records: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          failed_records?: number | null
          filename?: string
          id?: number
          new_records?: number
          processing_time_ms?: number | null
          started_at?: string | null
          status?: string | null
          total_records?: number
          updated_records?: number
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          assigned_at: string
          created_at: string
          customer_id: number
          id: string
          last_visit_date: string | null
          manually_assigned: boolean
          notes: string | null
          segment_type: string
          total_spend: number | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          customer_id: number
          id?: string
          last_visit_date?: string | null
          manually_assigned?: boolean
          notes?: string | null
          segment_type: string
          total_spend?: number | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          customer_id?: number
          id?: string
          last_visit_date?: string | null
          manually_assigned?: boolean
          notes?: string | null
          segment_type?: string
          total_spend?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_engagement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "intro_offer_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          agree_to_liability_waiver: boolean | null
          birthday: string | null
          client_email: string
          client_name: string
          conversion_date: string | null
          created_at: string | null
          customer_segment: string | null
          first_class_date: string | null
          first_name: string
          first_seen: string | null
          id: number
          intro_end_date: string | null
          intro_start_date: string | null
          last_class_date: string | null
          last_name: string
          last_seen: string | null
          marketing_email_opt_in: boolean | null
          marketing_text_opt_in: boolean | null
          notes: string | null
          phone_number: string | null
          pre_arketa_milestone_count: number | null
          source: string | null
          status: string | null
          tags: string | null
          total_lifetime_value: number | null
          transactional_text_opt_in: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          agree_to_liability_waiver?: boolean | null
          birthday?: string | null
          client_email: string
          client_name: string
          conversion_date?: string | null
          created_at?: string | null
          customer_segment?: string | null
          first_class_date?: string | null
          first_name: string
          first_seen?: string | null
          id?: number
          intro_end_date?: string | null
          intro_start_date?: string | null
          last_class_date?: string | null
          last_name: string
          last_seen?: string | null
          marketing_email_opt_in?: boolean | null
          marketing_text_opt_in?: boolean | null
          notes?: string | null
          phone_number?: string | null
          pre_arketa_milestone_count?: number | null
          source?: string | null
          status?: string | null
          tags?: string | null
          total_lifetime_value?: number | null
          transactional_text_opt_in?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          agree_to_liability_waiver?: boolean | null
          birthday?: string | null
          client_email?: string
          client_name?: string
          conversion_date?: string | null
          created_at?: string | null
          customer_segment?: string | null
          first_class_date?: string | null
          first_name?: string
          first_seen?: string | null
          id?: number
          intro_end_date?: string | null
          intro_start_date?: string | null
          last_class_date?: string | null
          last_name?: string
          last_seen?: string | null
          marketing_email_opt_in?: boolean | null
          marketing_text_opt_in?: boolean | null
          notes?: string | null
          phone_number?: string | null
          pre_arketa_milestone_count?: number | null
          source?: string | null
          status?: string | null
          tags?: string | null
          total_lifetime_value?: number | null
          transactional_text_opt_in?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          customer_id: number
          email_data: Json | null
          error_message: string | null
          id: string
          scheduled_for: string
          segment_type: string
          sent_at: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: number
          email_data?: Json | null
          error_message?: string | null
          id?: string
          scheduled_for: string
          segment_type: string
          sent_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: number
          email_data?: Json | null
          error_message?: string | null
          id?: string
          scheduled_for?: string
          segment_type?: string
          sent_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_engagement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "intro_offer_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          subject: string
          template_name: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject: string
          template_name: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject?: string
          template_name?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_tracking: {
        Row: {
          clicked_at: string | null
          created_at: string
          customer_id: number
          email_content: string | null
          email_subject: string | null
          id: string
          opened_at: string | null
          replied_at: string | null
          sent_at: string
          template_type: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          customer_id: number
          email_content?: string | null
          email_subject?: string | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string
          template_type: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          customer_id?: number
          email_content?: string | null
          email_subject?: string | null
          id?: string
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_engagement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "intro_offer_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          email: string
          first_name: string
          follow_up_count: number | null
          id: string
          last_contact_date: string | null
          last_name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          email: string
          first_name: string
          follow_up_count?: number | null
          id?: string
          last_contact_date?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          follow_up_count?: number | null
          id?: string
          last_contact_date?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_sequences: {
        Row: {
          active: boolean | null
          content: string
          created_at: string | null
          day: number
          id: number
          message_type: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string | null
          day: number
          id?: number
          message_type: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string | null
          day?: number
          id?: number
          message_type?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      segment_analytics: {
        Row: {
          conversions: number
          created_at: string
          date: string
          emails_clicked: number
          emails_opened: number
          emails_sent: number
          id: string
          segment_type: string
          total_customers: number
        }
        Insert: {
          conversions?: number
          created_at?: string
          date?: string
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          id?: string
          segment_type: string
          total_customers?: number
        }
        Update: {
          conversions?: number
          created_at?: string
          date?: string
          emails_clicked?: number
          emails_opened?: number
          emails_sent?: number
          id?: string
          segment_type?: string
          total_customers?: number
        }
        Relationships: []
      }
    }
    Views: {
      customer_engagement_stats: {
        Row: {
          attendance_rate: number | null
          cancellations: number | null
          classes_attended: number | null
          client_email: string | null
          conversion_date: string | null
          engagement_level: string | null
          first_class_date: string | null
          first_name: string | null
          id: number | null
          last_attended_date: string | null
          last_booking_date: string | null
          last_class_date: string | null
          last_name: string | null
          no_shows: number | null
          status: string | null
          total_bookings: number | null
        }
        Relationships: []
      }
      customers_by_stage: {
        Row: {
          customer_count: number | null
          customers: Json | null
          stage: string | null
        }
        Relationships: []
      }
      dashboard_metrics: {
        Row: {
          active_intro_offers: number | null
          avg_capacity_today: number | null
          bookings_this_week: number | null
          ending_this_week: number | null
          intro_customers_never_attended: number | null
          intro_customers_never_booked: number | null
          new_leads_week: number | null
          no_shows_this_month: number | null
          revenue_last_month: number | null
          revenue_this_month: number | null
          todays_classes: number | null
          waitlisted_classes: number | null
        }
        Relationships: []
      }
      intro_offer_customers: {
        Row: {
          address: string | null
          agree_to_liability_waiver: boolean | null
          birthday: string | null
          client_email: string | null
          client_name: string | null
          created_at: string | null
          current_day: number | null
          days_remaining: number | null
          first_name: string | null
          first_seen: string | null
          id: number | null
          intro_end_date: string | null
          intro_start_date: string | null
          intro_status: string | null
          last_name: string | null
          last_seen: string | null
          marketing_email_opt_in: boolean | null
          marketing_text_opt_in: boolean | null
          phone_number: string | null
          pre_arketa_milestone_count: number | null
          tags: string | null
          transactional_text_opt_in: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          agree_to_liability_waiver?: boolean | null
          birthday?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          current_day?: never
          days_remaining?: never
          first_name?: string | null
          first_seen?: string | null
          id?: number | null
          intro_end_date?: never
          intro_start_date?: string | null
          intro_status?: never
          last_name?: string | null
          last_seen?: string | null
          marketing_email_opt_in?: boolean | null
          marketing_text_opt_in?: boolean | null
          phone_number?: string | null
          pre_arketa_milestone_count?: number | null
          tags?: string | null
          transactional_text_opt_in?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          agree_to_liability_waiver?: boolean | null
          birthday?: string | null
          client_email?: string | null
          client_name?: string | null
          created_at?: string | null
          current_day?: never
          days_remaining?: never
          first_name?: string | null
          first_seen?: string | null
          id?: number | null
          intro_end_date?: never
          intro_start_date?: string | null
          intro_status?: never
          last_name?: string | null
          last_seen?: string | null
          marketing_email_opt_in?: boolean | null
          marketing_text_opt_in?: boolean | null
          phone_number?: string | null
          pre_arketa_milestone_count?: number | null
          tags?: string | null
          transactional_text_opt_in?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_customer_segment: {
        Args: { customer_id_param: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
