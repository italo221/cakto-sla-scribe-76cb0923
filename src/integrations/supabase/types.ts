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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cargos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          criado_em: string | null
          data_cadastro: string | null
          email: string | null
          faturamento: number | null
          faturamento_mes: number | null
          id: string
          instagram: string | null
          interesse_visitar_escritorio: boolean | null
          nome: string | null
          observacoes: string | null
          pagina_vendas: string | null
          pipefy_id: number | null
          plataforma_atual: string | null
          telefone: string | null
        }
        Insert: {
          criado_em?: string | null
          data_cadastro?: string | null
          email?: string | null
          faturamento?: number | null
          faturamento_mes?: number | null
          id?: string
          instagram?: string | null
          interesse_visitar_escritorio?: boolean | null
          nome?: string | null
          observacoes?: string | null
          pagina_vendas?: string | null
          pipefy_id?: number | null
          plataforma_atual?: string | null
          telefone?: string | null
        }
        Update: {
          criado_em?: string | null
          data_cadastro?: string | null
          email?: string | null
          faturamento?: number | null
          faturamento_mes?: number | null
          id?: string
          instagram?: string | null
          interesse_visitar_escritorio?: boolean | null
          nome?: string | null
          observacoes?: string | null
          pagina_vendas?: string | null
          pipefy_id?: number | null
          plataforma_atual?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      lib_color_combinations: {
        Row: {
          combination_name: string | null
          id: string
          primary_color_hex: string
          primary_color_hsl: string
          secondary_color_hex: string
          secondary_color_hsl: string
          used_at: string
          used_by: string | null
        }
        Insert: {
          combination_name?: string | null
          id?: string
          primary_color_hex: string
          primary_color_hsl: string
          secondary_color_hex: string
          secondary_color_hsl: string
          used_at?: string
          used_by?: string | null
        }
        Update: {
          combination_name?: string | null
          id?: string
          primary_color_hex?: string
          primary_color_hsl?: string
          secondary_color_hex?: string
          secondary_color_hsl?: string
          used_at?: string
          used_by?: string | null
        }
        Relationships: []
      }
      lib_color_history: {
        Row: {
          color_hex: string
          color_hsl: string
          color_name: string | null
          id: string
          used_at: string
          used_by: string | null
        }
        Insert: {
          color_hex: string
          color_hsl: string
          color_name?: string | null
          id?: string
          used_at?: string
          used_by?: string | null
        }
        Update: {
          color_hex?: string
          color_hsl?: string
          color_name?: string | null
          id?: string
          used_at?: string
          used_by?: string | null
        }
        Relationships: []
      }
      lib_custom_presets: {
        Row: {
          border_color: string | null
          border_radius: string | null
          border_style: string | null
          border_width: string | null
          button_color: string
          button_style: string
          created_at: string
          font_family: string
          gradient_angle: number
          gradient_color: string
          id: string
          preset_name: string
          primary_color: string
          shadow_enabled: boolean
          text_color: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          border_color?: string | null
          border_radius?: string | null
          border_style?: string | null
          border_width?: string | null
          button_color: string
          button_style?: string
          created_at?: string
          font_family?: string
          gradient_angle?: number
          gradient_color: string
          id?: string
          preset_name: string
          primary_color: string
          shadow_enabled?: boolean
          text_color: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          border_color?: string | null
          border_radius?: string | null
          border_style?: string | null
          border_width?: string | null
          button_color?: string
          button_style?: string
          created_at?: string
          font_family?: string
          gradient_angle?: number
          gradient_color?: string
          id?: string
          preset_name?: string
          primary_color?: string
          shadow_enabled?: boolean
          text_color?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lib_link_clicks: {
        Row: {
          city: string | null
          clicked_at: string | null
          country: string | null
          id: string
          ip_address: unknown | null
          link_id: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown | null
          link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown | null
          link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "lib_user_links"
            referencedColumns: ["id"]
          },
        ]
      }
      lib_link_profiles: {
        Row: {
          avatar_url: string | null
          background_image_url: string | null
          bio: string | null
          border_color: string | null
          border_radius: string | null
          border_style: string | null
          border_width: string | null
          button_alignment: string | null
          button_corners: string | null
          button_shadow: string | null
          button_style: string | null
          created_at: string | null
          display_name: string
          font_family: string | null
          id: string
          is_public: boolean | null
          show_username_symbol: boolean
          theme_colors: Json | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          background_image_url?: string | null
          bio?: string | null
          border_color?: string | null
          border_radius?: string | null
          border_style?: string | null
          border_width?: string | null
          button_alignment?: string | null
          button_corners?: string | null
          button_shadow?: string | null
          button_style?: string | null
          created_at?: string | null
          display_name: string
          font_family?: string | null
          id?: string
          is_public?: boolean | null
          show_username_symbol?: boolean
          theme_colors?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          background_image_url?: string | null
          bio?: string | null
          border_color?: string | null
          border_radius?: string | null
          border_style?: string | null
          border_width?: string | null
          button_alignment?: string | null
          button_corners?: string | null
          button_shadow?: string | null
          button_style?: string | null
          created_at?: string | null
          display_name?: string
          font_family?: string | null
          id?: string
          is_public?: boolean | null
          show_username_symbol?: boolean
          theme_colors?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      lib_themes: {
        Row: {
          colors: Json
          created_at: string | null
          display_name: string
          font_family: string | null
          id: string
          is_premium: boolean | null
          name: string
        }
        Insert: {
          colors: Json
          created_at?: string | null
          display_name: string
          font_family?: string | null
          id?: string
          is_premium?: boolean | null
          name: string
        }
        Update: {
          colors?: Json
          created_at?: string | null
          display_name?: string
          font_family?: string | null
          id?: string
          is_premium?: boolean | null
          name?: string
        }
        Relationships: []
      }
      lib_user_links: {
        Row: {
          badge_text: string | null
          created_at: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          link_type: Database["public"]["Enums"]["link_type"] | null
          profile_id: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          link_type?: Database["public"]["Enums"]["link_type"] | null
          profile_id?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          link_type?: Database["public"]["Enums"]["link_type"] | null
          profile_id?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "lib_link_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_permissoes: {
        Row: {
          acao: string
          alteracoes: Json | null
          cargo_alterado_id: string
          cargo_alterado_nome: string
          criado_em: string
          id: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          acao: string
          alteracoes?: Json | null
          cargo_alterado_id: string
          cargo_alterado_nome: string
          criado_em?: string
          id?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          acao?: string
          alteracoes?: Json | null
          cargo_alterado_id?: string
          cargo_alterado_nome?: string
          criado_em?: string
          id?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_permissoes_cargo_alterado_id_fkey"
            columns: ["cargo_alterado_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          ticket_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          ticket_id?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          ticket_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permissoes_cargo: {
        Row: {
          cargo_id: string
          created_at: string
          id: string
          pode_comentar: boolean
          pode_criar_ticket: boolean
          pode_editar_comentario: boolean
          pode_editar_comentario_proprio: boolean
          pode_editar_ticket: boolean
          pode_excluir_comentario: boolean
          pode_excluir_ticket: boolean
          updated_at: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          id?: string
          pode_comentar?: boolean
          pode_criar_ticket?: boolean
          pode_editar_comentario?: boolean
          pode_editar_comentario_proprio?: boolean
          pode_editar_ticket?: boolean
          pode_excluir_comentario?: boolean
          pode_excluir_ticket?: boolean
          updated_at?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          id?: string
          pode_comentar?: boolean
          pode_criar_ticket?: boolean
          pode_editar_comentario?: boolean
          pode_editar_comentario_proprio?: boolean
          pode_editar_ticket?: boolean
          pode_excluir_comentario?: boolean
          pode_excluir_ticket?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_cargo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: true
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo_id: string | null
          created_at: string
          email: string
          id: string
          navbar_glass: boolean | null
          navbar_position: string | null
          nome_completo: string
          role: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo_id?: string | null
          created_at?: string
          email: string
          id?: string
          navbar_glass?: boolean | null
          navbar_position?: string | null
          nome_completo: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo_id?: string | null
          created_at?: string
          email?: string
          id?: string
          navbar_glass?: boolean | null
          navbar_position?: string | null
          nome_completo?: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      setor_permissoes: {
        Row: {
          created_at: string
          id: string
          pode_comentar: boolean
          pode_criar_ticket: boolean
          pode_editar_ticket: boolean
          pode_excluir_ticket: boolean
          pode_resolver_ticket: boolean
          setor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pode_comentar?: boolean
          pode_criar_ticket?: boolean
          pode_editar_ticket?: boolean
          pode_excluir_ticket?: boolean
          pode_resolver_ticket?: boolean
          setor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pode_comentar?: boolean
          pode_criar_ticket?: boolean
          pode_editar_ticket?: boolean
          pode_excluir_ticket?: boolean
          pode_resolver_ticket?: boolean
          setor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setor_permissoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: true
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      sla_action_logs: {
        Row: {
          acao: string
          autor_email: string
          autor_id: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          justificativa: string | null
          setor_destino_id: string | null
          setor_origem_id: string | null
          sla_id: string
          timestamp: string
        }
        Insert: {
          acao: string
          autor_email: string
          autor_id: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          justificativa?: string | null
          setor_destino_id?: string | null
          setor_origem_id?: string | null
          sla_id: string
          timestamp?: string
        }
        Update: {
          acao?: string
          autor_email?: string
          autor_id?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          justificativa?: string | null
          setor_destino_id?: string | null
          setor_origem_id?: string | null
          sla_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_action_logs_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sla_action_logs_setor_destino_fkey"
            columns: ["setor_destino_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_action_logs_setor_destino_id_fkey"
            columns: ["setor_destino_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_action_logs_setor_origem_fkey"
            columns: ["setor_origem_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_action_logs_setor_origem_id_fkey"
            columns: ["setor_origem_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_action_logs_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "sla_demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_comentarios_internos: {
        Row: {
          anexos: Json | null
          autor_id: string
          autor_nome: string
          comentario: string
          created_at: string
          id: string
          setor_id: string
          sla_id: string
          updated_at: string | null
        }
        Insert: {
          anexos?: Json | null
          autor_id: string
          autor_nome: string
          comentario: string
          created_at?: string
          id?: string
          setor_id: string
          sla_id: string
          updated_at?: string | null
        }
        Update: {
          anexos?: Json | null
          autor_id?: string
          autor_nome?: string
          comentario?: string
          created_at?: string
          id?: string
          setor_id?: string
          sla_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_comentarios_internos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sla_comentarios_internos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_comentarios_internos_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "sla_demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_comentarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_comentarios_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "sla_demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_demandas: {
        Row: {
          anexos: Json | null
          arquivos: Json | null
          data_criacao: string
          descricao: string
          id: string
          link_referencia: string | null
          nivel_criticidade: string
          observacoes: string | null
          pontuacao_cliente: number
          pontuacao_financeiro: number
          pontuacao_operacional: number
          pontuacao_reputacao: number
          pontuacao_total: number
          pontuacao_urgencia: number
          prazo_interno: string | null
          prioridade_operacional:
            | Database["public"]["Enums"]["prioridade_operacional"]
            | null
          responsavel_interno: string | null
          setor_id: string | null
          solicitante: string
          status: string
          tags: string[] | null
          ticket_number: string | null
          time_responsavel: string
          tipo_ticket: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          anexos?: Json | null
          arquivos?: Json | null
          data_criacao?: string
          descricao: string
          id?: string
          link_referencia?: string | null
          nivel_criticidade: string
          observacoes?: string | null
          pontuacao_cliente: number
          pontuacao_financeiro: number
          pontuacao_operacional: number
          pontuacao_reputacao: number
          pontuacao_total: number
          pontuacao_urgencia: number
          prazo_interno?: string | null
          prioridade_operacional?:
            | Database["public"]["Enums"]["prioridade_operacional"]
            | null
          responsavel_interno?: string | null
          setor_id?: string | null
          solicitante: string
          status?: string
          tags?: string[] | null
          ticket_number?: string | null
          time_responsavel: string
          tipo_ticket?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          anexos?: Json | null
          arquivos?: Json | null
          data_criacao?: string
          descricao?: string
          id?: string
          link_referencia?: string | null
          nivel_criticidade?: string
          observacoes?: string | null
          pontuacao_cliente?: number
          pontuacao_financeiro?: number
          pontuacao_operacional?: number
          pontuacao_reputacao?: number
          pontuacao_total?: number
          pontuacao_urgencia?: number
          prazo_interno?: string | null
          prioridade_operacional?:
            | Database["public"]["Enums"]["prioridade_operacional"]
            | null
          responsavel_interno?: string | null
          setor_id?: string | null
          solicitante?: string
          status?: string
          tags?: string[] | null
          ticket_number?: string | null
          time_responsavel?: string
          tipo_ticket?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_demandas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_logs: {
        Row: {
          dados_criados: Json | null
          id: string
          id_demanda: string | null
          origem: string
          timestamp: string
          tipo_acao: string
          usuario_responsavel: string | null
        }
        Insert: {
          dados_criados?: Json | null
          id?: string
          id_demanda?: string | null
          origem?: string
          timestamp?: string
          tipo_acao: string
          usuario_responsavel?: string | null
        }
        Update: {
          dados_criados?: Json | null
          id?: string
          id_demanda?: string | null
          origem?: string
          timestamp?: string
          tipo_acao?: string
          usuario_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_logs_id_demanda_fkey"
            columns: ["id_demanda"]
            isOneToOne: false
            referencedRelation: "sla_demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          comment_id: string | null
          created_at: string
          file_name: string
          id: string
          mime_type: string
          size: number
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          size: number
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          size?: number
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "sla_comentarios_internos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "sla_demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_kyc: {
        Row: {
          created_at: string
          email: string
          id: string
          kyc_date: string | null
          kyc_status: string
          updated_at: string
          verification_level: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          kyc_date?: string | null
          kyc_status?: string
          updated_at?: string
          verification_level?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kyc_date?: string | null
          kyc_status?: string
          updated_at?: string
          verification_level?: string | null
        }
        Relationships: []
      }
      user_profits: {
        Row: {
          created_at: string
          description: string | null
          email: string
          id: string
          profit_amount: number
          profit_date: string
          profit_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email: string
          id?: string
          profit_amount: number
          profit_date: string
          profit_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          profit_amount?: number
          profit_date?: string
          profit_type?: string | null
        }
        Relationships: []
      }
      user_registrations: {
        Row: {
          created_at: string
          email: string
          id: string
          registration_date: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          registration_date?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          registration_date?: string
          status?: string
        }
        Relationships: []
      }
      user_setores: {
        Row: {
          created_at: string
          id: string
          is_leader: boolean
          setor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_leader?: boolean
          setor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_leader?: boolean
          setor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_setores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_hidden_tag: {
        Args: { p_tag: string }
        Returns: boolean
      }
      add_sla_comment: {
        Args: { p_comentario: string; p_setor_id: string; p_sla_id: string }
        Returns: string
      }
      can_edit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      delete_ticket_cascade: {
        Args: { ticket_id: string }
        Returns: boolean
      }
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_hidden_tags: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_stats: {
        Args: { user_email: string }
        Returns: {
          email: string
          has_registration: boolean
          kyc_date: string
          kyc_status: string
          profit_count_30_days: number
          registration_date: string
          registration_status: string
          total_profit_30_days: number
        }[]
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_sla_action: {
        Args: {
          p_acao: string
          p_dados_anteriores?: Json
          p_dados_novos?: Json
          p_justificativa?: string
          p_setor_destino_id?: string
          p_setor_origem_id?: string
          p_sla_id: string
        }
        Returns: string
      }
      mention_search: {
        Args: { q?: string }
        Returns: {
          email: string
          nome_completo: string
          user_id: string
        }[]
      }
      user_has_setor_access: {
        Args: { setor_uuid: string; user_uuid?: string }
        Returns: boolean
      }
    }
    Enums: {
      link_type: "link" | "video" | "form" | "qr"
      prioridade_operacional: "alta" | "media" | "baixa"
      user_role: "super_admin" | "operador" | "viewer"
      user_type: "administrador_master" | "colaborador_setor"
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
      link_type: ["link", "video", "form", "qr"],
      prioridade_operacional: ["alta", "media", "baixa"],
      user_role: ["super_admin", "operador", "viewer"],
      user_type: ["administrador_master", "colaborador_setor"],
    },
  },
} as const
