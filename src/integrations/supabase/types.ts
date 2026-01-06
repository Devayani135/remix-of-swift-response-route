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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          affected_route_id: string | null
          alternate_route_id: string | null
          coordinates: Json | null
          created_at: string
          description: string | null
          detected_at: string
          id: string
          is_active: boolean
          location: string
          resolved_at: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          affected_route_id?: string | null
          alternate_route_id?: string | null
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          is_active?: boolean
          location: string
          resolved_at?: string | null
          severity: string
          title: string
          type: string
        }
        Update: {
          affected_route_id?: string | null
          alternate_route_id?: string | null
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          is_active?: boolean
          location?: string
          resolved_at?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_affected_route_id_fkey"
            columns: ["affected_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_alternate_route_id_fkey"
            columns: ["alternate_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_cameras: {
        Row: {
          coordinates: Json
          created_at: string
          density: number
          feed_url: string | null
          id: string
          last_updated: string
          location: string
          name: string
          status: string
          vehicle_count: number
        }
        Insert: {
          coordinates: Json
          created_at?: string
          density?: number
          feed_url?: string | null
          id?: string
          last_updated?: string
          location: string
          name: string
          status?: string
          vehicle_count?: number
        }
        Update: {
          coordinates?: Json
          created_at?: string
          density?: number
          feed_url?: string | null
          id?: string
          last_updated?: string
          location?: string
          name?: string
          status?: string
          vehicle_count?: number
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string
          distance_km: number
          end_point: string
          estimated_time_minutes: number
          id: string
          is_active: boolean
          name: string
          route_type: string
          start_point: string
          updated_at: string
          waypoints: Json
        }
        Insert: {
          created_at?: string
          distance_km: number
          end_point: string
          estimated_time_minutes: number
          id?: string
          is_active?: boolean
          name: string
          route_type?: string
          start_point: string
          updated_at?: string
          waypoints?: Json
        }
        Update: {
          created_at?: string
          distance_km?: number
          end_point?: string
          estimated_time_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          route_type?: string
          start_point?: string
          updated_at?: string
          waypoints?: Json
        }
        Relationships: []
      }
      traffic_data: {
        Row: {
          average_speed: number | null
          coordinates: Json
          created_at: string
          density: number
          id: string
          last_updated: string
          segment_name: string
          vehicle_count: number
        }
        Insert: {
          average_speed?: number | null
          coordinates: Json
          created_at?: string
          density: number
          id?: string
          last_updated?: string
          segment_name: string
          vehicle_count?: number
        }
        Update: {
          average_speed?: number | null
          coordinates?: Json
          created_at?: string
          density?: number
          id?: string
          last_updated?: string
          segment_name?: string
          vehicle_count?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          current_position: Json | null
          current_route_id: string | null
          dispatched_at: string | null
          driver_contact: string | null
          driver_name: string
          id: string
          status: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          current_position?: Json | null
          current_route_id?: string | null
          dispatched_at?: string | null
          driver_contact?: string | null
          driver_name: string
          id?: string
          status?: string
          updated_at?: string
          vehicle_number: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          current_position?: Json | null
          current_route_id?: string | null
          dispatched_at?: string | null
          driver_contact?: string | null
          driver_name?: string
          id?: string
          status?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_current_route_id_fkey"
            columns: ["current_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
