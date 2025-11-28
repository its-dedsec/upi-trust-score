export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          upi_identity_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          upi_identity_id: string
        }
        Update: {
          created_at?: string
          id?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          upi_identity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_upi_identity_id_fkey"
            columns: ["upi_identity_id"]
            isOneToOne: false
            referencedRelation: "upi_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_reports: {
        Row: {
          created_at: string
          evidence_url: string | null
          id: string
          reason: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          upi_identity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          upi_identity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          upi_identity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_reports_upi_identity_id_fkey"
            columns: ["upi_identity_id"]
            isOneToOne: false
            referencedRelation: "upi_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_identities: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          upi_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          upi_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          badge_level: string
          created_at: string
          id: string
          points: number
          total_reports: number
          total_verifications: number
          total_votes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_level?: string
          created_at?: string
          id?: string
          points?: number
          total_reports?: number
          total_verifications?: number
          total_votes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_level?: string
          created_at?: string
          id?: string
          points?: number
          total_reports?: number
          total_verifications?: number
          total_votes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_votes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          verification_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          verification_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          verification_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "verification_votes_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          upi_identity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          upi_identity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          upi_identity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_upi_identity_id_fkey"
            columns: ["upi_identity_id"]
            isOneToOne: false
            referencedRelation: "upi_identities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      app_role: "user" | "admin"
      report_status: "open" | "resolved" | "rejected"
      risk_level: "low" | "medium" | "high"
      vote_type: "safe" | "unsafe"
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
    Enums: {
      alert_severity: ["info", "warning", "critical"],
      app_role: ["user", "admin"],
      report_status: ["open", "resolved", "rejected"],
      risk_level: ["low", "medium", "high"],
      vote_type: ["safe", "unsafe"],
    },
  },
} as const
