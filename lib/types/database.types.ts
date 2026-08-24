export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // carries the generated api version into client setup.
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          drive_id: string
          id: string
          resume_document_id: string
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          drive_id: string
          id?: string
          resume_document_id: string
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          drive_id?: string
          id?: string
          resume_document_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_document_id_fkey"
            columns: ["resume_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          student_id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
        }
        Insert: {
          id?: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          student_id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Update: {
          id?: string
          mime_type?: string
          original_name?: string
          size_bytes?: number
          storage_path?: string
          student_id?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drives: {
        Row: {
          company_name: string
          created_at: string
          created_by: string
          description: string
          drive_date: string | null
          eligible_branches: string[]
          eligible_years: number[]
          id: string
          job_role: string
          location: string | null
          maximum_backlogs: number
          minimum_cgpa: number
          package_text: string | null
          registration_deadline: string
          status: Database["public"]["Enums"]["drive_status"]
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by: string
          description?: string
          drive_date?: string | null
          eligible_branches: string[]
          eligible_years: number[]
          id?: string
          job_role: string
          location?: string | null
          maximum_backlogs?: number
          minimum_cgpa?: number
          package_text?: string | null
          registration_deadline: string
          status?: Database["public"]["Enums"]["drive_status"]
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string
          description?: string
          drive_date?: string | null
          eligible_branches?: string[]
          eligible_years?: number[]
          id?: string
          job_role?: string
          location?: string | null
          maximum_backlogs?: number
          minimum_cgpa?: number
          package_text?: string | null
          registration_deadline?: string
          status?: Database["public"]["Enums"]["drive_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          body: string
          created_at: string
          drive_id: string | null
          event_key: string
          id: string
          read_at: string | null
          title: string
          type: string
          url: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          body: string
          created_at?: string
          drive_id?: string | null
          event_key: string
          id?: string
          read_at?: string | null
          title: string
          type: string
          url: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          body?: string
          created_at?: string
          drive_id?: string | null
          event_key?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          backlogs: number | null
          branch: string | null
          cgpa: number | null
          created_at: string
          email: string
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          id: string
          linkedin_url: string | null
          onboarding_completed_at: string | null
          primary_provider: string | null
          roll_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          backlogs?: number | null
          branch?: string | null
          cgpa?: number | null
          created_at?: string
          email: string
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id: string
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          primary_provider?: string | null
          roll_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          backlogs?: number | null
          branch?: string | null
          cgpa?: number | null
          created_at?: string
          email?: string
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          primary_provider?: string | null
          roll_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "student" | "coordinator"
      application_status: "applied" | "shortlisted" | "selected" | "rejected"
      document_type: "resume" | "marksheet" | "other"
      drive_status:
        | "draft"
        | "published"
        | "registration_closed"
        | "ongoing"
        | "completed"
        | "cancelled"
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
      app_role: ["student", "coordinator"],
      application_status: ["applied", "shortlisted", "selected", "rejected"],
      document_type: ["resume", "marksheet", "other"],
      drive_status: [
        "draft",
        "published",
        "registration_closed",
        "ongoing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
