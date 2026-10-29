// Generado con "npm run db:tipos". No se edita a mano.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cuenta: {
        Row: {
          creado_en: string
          creado_por: string | null
          entidad: string
          id: string
          modificado_en: string | null
          modificado_por: string | null
          nombre: string | null
          persona_id: string
          tipo_cuenta_id: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          entidad: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string | null
          persona_id: string
          tipo_cuenta_id: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          entidad?: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string | null
          persona_id?: string
          tipo_cuenta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "invertido_por_persona"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "cuenta_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_tipo_cuenta_fk"
            columns: ["tipo_cuenta_id"]
            isOneToOne: false
            referencedRelation: "tipo_cuenta"
            referencedColumns: ["id"]
          },
        ]
      }
      gasto: {
        Row: {
          creado_en: string
          creado_por: string | null
          descripcion: string | null
          fecha: string
          id: string
          modificado_en: string | null
          modificado_por: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          persona_id: string | null
          tipo_gasto_id: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          fecha: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          persona_id?: string | null
          tipo_gasto_id: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          fecha?: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          persona_id?: string | null
          tipo_gasto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gasto_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "invertido_por_persona"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "gasto_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gasto_tipo_gasto_fk"
            columns: ["tipo_gasto_id"]
            isOneToOne: false
            referencedRelation: "tipo_gasto"
            referencedColumns: ["id"]
          },
        ]
      }
      ingreso: {
        Row: {
          creado_en: string
          creado_por: string | null
          cuenta_id: string | null
          descripcion: string | null
          fecha: string
          id: string
          modificado_en: string | null
          modificado_por: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          persona_id: string
          tipo_ingreso_id: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          fecha: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          monto: number
          persona_id: string
          tipo_ingreso_id: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          fecha?: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          monto?: number
          persona_id?: string
          tipo_ingreso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingreso_cuenta_fk"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuenta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingreso_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "invertido_por_persona"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "ingreso_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingreso_tipo_ingreso_fk"
            columns: ["tipo_ingreso_id"]
            isOneToOne: false
            referencedRelation: "tipo_ingreso"
            referencedColumns: ["id"]
          },
        ]
      }
      instrumento: {
        Row: {
          creado_en: string
          creado_por: string | null
          id: string
          modificado_en: string | null
          modificado_por: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          nombre: string
          ticker: string
          tipo: string
          vencimiento: string | null
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          nombre: string
          ticker: string
          tipo: string
          vencimiento?: string | null
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre?: string
          ticker?: string
          tipo?: string
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instrumento_tipo_fk"
            columns: ["tipo"]
            isOneToOne: false
            referencedRelation: "tipo_instrumento"
            referencedColumns: ["codigo"]
          },
        ]
      }
      instrumento_cedear: {
        Row: {
          creado_en: string
          creado_por: string | null
          instrumento_id: string
          modificado_en: string | null
          modificado_por: string | null
          ratio: number | null
          subyacente: string | null
          tipo: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          instrumento_id: string
          modificado_en?: string | null
          modificado_por?: string | null
          ratio?: number | null
          subyacente?: string | null
          tipo?: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          instrumento_id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          ratio?: number | null
          subyacente?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrumento_cedear_instrumento_fk"
            columns: ["instrumento_id", "tipo"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id", "tipo"]
          },
        ]
      }
      instrumento_fci: {
        Row: {
          codigo_cafci: string
          creado_en: string
          creado_por: string | null
          instrumento_id: string
          modificado_en: string | null
          modificado_por: string | null
          tipo: string
        }
        Insert: {
          codigo_cafci: string
          creado_en?: string
          creado_por?: string | null
          instrumento_id: string
          modificado_en?: string | null
          modificado_por?: string | null
          tipo?: string
        }
        Update: {
          codigo_cafci?: string
          creado_en?: string
          creado_por?: string | null
          instrumento_id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "instrumento_fci_instrumento_fk"
            columns: ["instrumento_id", "tipo"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id", "tipo"]
          },
        ]
      }
      instrumento_on: {
        Row: {
          creado_en: string
          creado_por: string | null
          emisor: string | null
          instrumento_id: string
          modificado_en: string | null
          modificado_por: string | null
          tipo: string
          valor_nominal_residual: number | null
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          emisor?: string | null
          instrumento_id: string
          modificado_en?: string | null
          modificado_por?: string | null
          tipo?: string
          valor_nominal_residual?: number | null
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          emisor?: string | null
          instrumento_id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          tipo?: string
          valor_nominal_residual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instrumento_on_instrumento_fk"
            columns: ["instrumento_id", "tipo"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id", "tipo"]
          },
        ]
      }
      operacion: {
        Row: {
          cantidad: number
          comision: number
          creado_en: string
          creado_por: string | null
          cuenta_id: string
          fecha: string
          id: string
          instrumento_id: string
          modificado_en: string | null
          modificado_por: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          orden: number
          precio_unitario: number
          tipo: string
        }
        Insert: {
          cantidad: number
          comision?: number
          creado_en?: string
          creado_por?: string | null
          cuenta_id: string
          fecha: string
          id?: string
          instrumento_id: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda: Database["public"]["Enums"]["moneda"]
          orden?: never
          precio_unitario: number
          tipo: string
        }
        Update: {
          cantidad?: number
          comision?: number
          creado_en?: string
          creado_por?: string | null
          cuenta_id?: string
          fecha?: string
          id?: string
          instrumento_id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          moneda?: Database["public"]["Enums"]["moneda"]
          orden?: never
          precio_unitario?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacion_cuenta_fk"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuenta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_instrumento_fk"
            columns: ["instrumento_id"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_moneda_instrumento_fk"
            columns: ["instrumento_id", "moneda"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id", "moneda"]
          },
          {
            foreignKeyName: "operacion_tipo_fk"
            columns: ["tipo"]
            isOneToOne: false
            referencedRelation: "tipo_operacion"
            referencedColumns: ["codigo"]
          },
        ]
      }
      persona: {
        Row: {
          creado_en: string
          creado_por: string | null
          email: string | null
          id: string
          modificado_en: string | null
          modificado_por: string | null
          nombre: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          email?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          email?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string
        }
        Relationships: []
      }
      tipo_cuenta: {
        Row: {
          creado_en: string
          creado_por: string | null
          id: string
          modificado_en: string | null
          modificado_por: string | null
          nombre: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string
        }
        Relationships: []
      }
      tipo_gasto: {
        Row: {
          creado_en: string
          creado_por: string | null
          id: string
          modificado_en: string | null
          modificado_por: string | null
          nombre: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string
        }
        Relationships: []
      }
      tipo_ingreso: {
        Row: {
          creado_en: string
          creado_por: string | null
          id: string
          modificado_en: string | null
          modificado_por: string | null
          nombre: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string
        }
        Relationships: []
      }
      tipo_instrumento: {
        Row: {
          codigo: string
          creado_en: string
          creado_por: string | null
          modificado_en: string | null
          modificado_por: string | null
          nombre: string
          precio_cada: number
        }
        Insert: {
          codigo: string
          creado_en?: string
          creado_por?: string | null
          modificado_en?: string | null
          modificado_por?: string | null
          nombre: string
          precio_cada?: number
        }
        Update: {
          codigo?: string
          creado_en?: string
          creado_por?: string | null
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string
          precio_cada?: number
        }
        Relationships: []
      }
      tipo_operacion: {
        Row: {
          codigo: string
          creado_en: string
          creado_por: string | null
          modificado_en: string | null
          modificado_por: string | null
          nombre: string
        }
        Insert: {
          codigo: string
          creado_en?: string
          creado_por?: string | null
          modificado_en?: string | null
          modificado_por?: string | null
          nombre: string
        }
        Update: {
          codigo?: string
          creado_en?: string
          creado_por?: string | null
          modificado_en?: string | null
          modificado_por?: string | null
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      invertido_grupo: {
        Row: {
          costo: number | null
          moneda: Database["public"]["Enums"]["moneda"] | null
        }
        Relationships: []
      }
      invertido_por_persona: {
        Row: {
          costo: number | null
          moneda: Database["public"]["Enums"]["moneda"] | null
          nombre: string | null
          persona_id: string | null
          tiene_inversiones: boolean | null
        }
        Relationships: []
      }
      posicion: {
        Row: {
          cantidad: number | null
          costo: number | null
          cuenta_id: string | null
          instrumento_id: string | null
          moneda: Database["public"]["Enums"]["moneda"] | null
          persona_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "invertido_por_persona"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "cuenta_persona_fk"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_cuenta_fk"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuenta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_instrumento_fk"
            columns: ["instrumento_id"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacion_moneda_instrumento_fk"
            columns: ["instrumento_id", "moneda"]
            isOneToOne: false
            referencedRelation: "instrumento"
            referencedColumns: ["id", "moneda"]
          },
        ]
      }
      ultimos_movimientos: {
        Row: {
          categoria: string | null
          clase: string | null
          creado_en: string | null
          descripcion: string | null
          fecha: string | null
          id: string | null
          moneda: Database["public"]["Enums"]["moneda"] | null
          monto: number | null
          persona: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agregar_autoria: { Args: { p_tabla: unknown }; Returns: undefined }
      antes_de_crear_usuario: { Args: { event: Json }; Returns: Json }
      email_de_la_sesion: { Args: never; Returns: string }
      es_miembro: { Args: never; Returns: boolean }
      guardar_instrumento: {
        Args: {
          p_codigo_cafci?: string
          p_emisor?: string
          p_id?: string
          p_moneda: Database["public"]["Enums"]["moneda"]
          p_nombre: string
          p_ratio?: number
          p_subyacente?: string
          p_ticker: string
          p_tipo: string
          p_valor_nominal_residual?: number
          p_vencimiento?: string
        }
        Returns: string
      }
      paso_costo_promedio: {
        Args: {
          p_cantidad: number
          p_comision: number
          p_estado: Database["public"]["CompositeTypes"]["estado_costo"]
          p_precio_cada: number
          p_precio_unitario: number
          p_tipo: string
        }
        Returns: Database["public"]["CompositeTypes"]["estado_costo"]
        SetofOptions: {
          from: "*"
          to: "estado_costo"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resumen_mes: {
        Args: { p_mes: string; p_persona?: string }
        Returns: {
          gastos: number
          gastos_asignados: number
          gastos_comunitarios: number
          ingresos: number
          moneda: Database["public"]["Enums"]["moneda"]
          queda: number
        }[]
      }
      validar_posicion: {
        Args: { p_cuenta_id: string; p_instrumento_id: string }
        Returns: undefined
      }
    }
    Enums: {
      moneda: "ARS" | "USD"
    }
    CompositeTypes: {
      estado_costo: {
        cantidad: number | null
        costo: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      moneda: ["ARS", "USD"],
    },
  },
} as const
