// Generated-compatible local fallback for the Phase 1 migration. Regenerate with
// `supabase gen types typescript --linked --schema public` after this project is linked.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Timestamps = {
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: Timestamps & { id: string; name: string; owner_id: string }
        Insert: { id?: string; name: string; owner_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; owner_id?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      workspace_members: {
        Row: { id: string; workspace_id: string; user_id: string; role: Database['public']['Enums']['workspace_role']; created_at: string }
        Insert: { id?: string; workspace_id: string; user_id: string; role?: Database['public']['Enums']['workspace_role']; created_at?: string }
        Update: { id?: string; workspace_id?: string; user_id?: string; role?: Database['public']['Enums']['workspace_role']; created_at?: string }
        Relationships: []
      }
      tracks: {
        Row: Timestamps & { id: string; workspace_id: string; code: Database['public']['Enums']['track_code']; name: string }
        Insert: { id?: string; workspace_id: string; code: Database['public']['Enums']['track_code']; name: string; created_at?: string; updated_at?: string }
        Update: { id?: string; workspace_id?: string; code?: Database['public']['Enums']['track_code']; name?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      content_items: {
        Row: Timestamps & {
          id: string
          workspace_id: string
          track_id: string
          title: string
          insight: string | null
          audience: string | null
          content_type: string | null
          keyword: string | null
          objective: string | null
          priority: Database['public']['Enums']['priority_level']
          topic_status: Database['public']['Enums']['topic_status']
          production_stage: Database['public']['Enums']['production_stage']
          planned_for: string | null
          deleted_at: string | null
          created_by: string
        }
        Insert: {
          id?: string
          workspace_id: string
          track_id: string
          title: string
          insight?: string | null
          audience?: string | null
          content_type?: string | null
          keyword?: string | null
          objective?: string | null
          priority?: Database['public']['Enums']['priority_level']
          topic_status?: Database['public']['Enums']['topic_status']
          production_stage?: Database['public']['Enums']['production_stage']
          planned_for?: string | null
          deleted_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['content_items']['Insert']>
        Relationships: []
      }
      scripts: {
        Row: Timestamps & {
          id: string
          workspace_id: string
          content_id: string
          version: number
          title: string
          hook: string
          body: string
          shot_list: Json
          caption: string | null
          hashtags: string[]
          estimated_seconds: number | null
          status: string
          created_by: string
        }
        Insert: {
          id?: string
          workspace_id: string
          content_id: string
          version: number
          title: string
          hook: string
          body: string
          shot_list?: Json
          caption?: string | null
          hashtags?: string[]
          estimated_seconds?: number | null
          status?: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['scripts']['Insert']>
        Relationships: []
      }
      shoot_tasks: {
        Row: Timestamps & {
          id: string
          workspace_id: string
          content_id: string
          scheduled_for: string | null
          location: string | null
          people: string[]
          required_shots: Json
          notes: string | null
          status: string
          completed_at: string | null
          created_by: string
        }
        Insert: {
          id?: string
          workspace_id: string
          content_id: string
          scheduled_for?: string | null
          location?: string | null
          people?: string[]
          required_shots?: Json
          notes?: string | null
          status?: string
          completed_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shoot_tasks']['Insert']>
        Relationships: []
      }
      assets: {
        Row: Timestamps & { id: string; workspace_id: string; content_id: string | null; storage_path: string | null; external_url: string | null; label: string | null; created_by: string }
        Insert: { id?: string; workspace_id: string; content_id?: string | null; storage_path?: string | null; external_url?: string | null; label?: string | null; created_by: string; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
        Relationships: []
      }
      activity_logs: {
        Row: { id: string; workspace_id: string; actor_id: string; entity_type: string; entity_id: string; action: Database['public']['Enums']['activity_action']; details: Json; created_at: string }
        Insert: { id?: string; workspace_id: string; actor_id: string; entity_type: string; entity_id: string; action: Database['public']['Enums']['activity_action']; details?: Json; created_at?: string }
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      bootstrap_workspace: { Args: { workspace_name?: string }; Returns: Database['public']['Tables']['workspaces']['Row'] }
      is_workspace_member: { Args: { workspace_id: string }; Returns: boolean }
      is_workspace_owner: { Args: { workspace_id: string }; Returns: boolean }
    }
    Enums: {
      workspace_role: 'owner' | 'readonly'
      track_code: 'weiwu_b2b' | 'coaching_c2c'
      topic_status: 'inbox' | 'validate' | 'approved' | 'paused' | 'archived'
      production_stage: 'no_script' | 'scripting' | 'ready_to_shoot' | 'shooting' | 'shot_waiting_edit' | 'ready_to_publish' | 'published' | 'reviewed'
      priority_level: 'low' | 'medium' | 'high'
      activity_action: 'created' | 'updated' | 'soft_deleted' | 'restored' | 'stage_changed' | 'deleted'
    }
    CompositeTypes: Record<never, never>
  }
}
