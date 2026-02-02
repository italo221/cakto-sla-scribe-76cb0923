import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, nome_completo } = await req.json()

    // Validações básicas
    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          error: 'Email e senha são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ 
          error: 'A senha deve ter pelo menos 6 caracteres' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato de email inválido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Cliente admin do Supabase (service role para bypass de RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const normalizedEmail = email.toLowerCase().trim()

    // ========================================
    // VALIDAR ALLOWLIST
    // ========================================
    console.log(`[signup-with-allowlist] Verificando email: ${normalizedEmail}`)

    const { data: allowlistEntry, error: allowlistError } = await supabaseAdmin
      .from('email_allowlist')
      .select('id, status, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (allowlistError) {
      console.error('[signup-with-allowlist] Erro ao verificar allowlist:', allowlistError)
      return new Response(
        JSON.stringify({ error: 'Erro ao validar email. Tente novamente.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Email não está na allowlist
    if (!allowlistEntry) {
      console.log(`[signup-with-allowlist] Email não encontrado na allowlist: ${normalizedEmail}`)
      return new Response(
        JSON.stringify({ 
          error: 'Email não autorizado. Entre em contato com o administrador para solicitar acesso.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Email está na allowlist mas não aprovado
    if (allowlistEntry.status !== 'approved') {
      console.log(`[signup-with-allowlist] Email com status não aprovado: ${allowlistEntry.status}`)
      
      const messages: Record<string, string> = {
        pending: 'Seu cadastro está aguardando aprovação do administrador.',
        rejected: 'Seu cadastro foi rejeitado. Entre em contato com o administrador.',
        revoked: 'Seu acesso foi revogado. Entre em contato com o administrador.'
      }
      
      return new Response(
        JSON.stringify({ 
          error: messages[allowlistEntry.status] || 'Acesso não autorizado.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ========================================
    // VERIFICAR SE USUÁRIO JÁ EXISTE
    // ========================================
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      console.log(`[signup-with-allowlist] Usuário já existe: ${normalizedEmail}`)
      return new Response(
        JSON.stringify({ 
          error: 'Este email já está cadastrado. Use a opção de login.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ========================================
    // CRIAR USUÁRIO NO AUTH
    // ========================================
    console.log(`[signup-with-allowlist] Criando usuário: ${normalizedEmail}`)

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirma email (sistema interno)
      user_metadata: {
        nome_completo: nome_completo || normalizedEmail.split('@')[0],
        created_via: 'allowlist_signup'
      }
    })

    if (signUpError) {
      console.error('[signup-with-allowlist] Erro ao criar usuário:', signUpError)
      
      // Tratar erro de usuário duplicado no Auth
      if (signUpError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado. Use a opção de login.' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: signUpError.message || 'Erro ao criar conta.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData.user) {
      console.error('[signup-with-allowlist] Usuário não retornado após criação')
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta. Tente novamente.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ========================================
    // CRIAR/ATUALIZAR PROFILE
    // O trigger handle_new_user já cria um profile básico
    // Apenas atualizamos os dados adicionais se necessário
    // ========================================
    console.log(`[signup-with-allowlist] Verificando/atualizando profile para user_id: ${authData.user.id}`)

    // Primeiro verificar se o profile já foi criado pelo trigger
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    let profileError = null

    if (existingProfile) {
      // Profile já existe (criado pelo trigger), apenas atualizar nome se fornecido
      if (nome_completo && nome_completo.trim()) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            nome_completo: nome_completo.trim(),
            ativo: true,
          })
          .eq('user_id', authData.user.id)
        profileError = error
      }
      console.log(`[signup-with-allowlist] Profile já existente, atualizado com nome: ${nome_completo}`)
    } else {
      // Profile não existe, criar
      const { error } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: normalizedEmail,
          nome_completo: nome_completo || normalizedEmail.split('@')[0],
          role: 'operador',
          user_type: 'colaborador_setor',
          ativo: true,
        })
      profileError = error
    }

    if (profileError) {
      // ROLLBACK: Deletar usuário criado no Auth
      console.error('[signup-with-allowlist] Erro ao criar profile, fazendo rollback:', profileError)
      
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('[signup-with-allowlist] Rollback do usuário concluído')
      } catch (rollbackError) {
        console.error('[signup-with-allowlist] Erro no rollback:', rollbackError)
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao criar perfil. Tente novamente.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ========================================
    // REGISTRAR AUDITORIA
    // ========================================
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'SIGNUP_VIA_ALLOWLIST',
        table_name: 'profiles',
        record_id: authData.user.id,
        new_data: { 
          email: normalizedEmail,
          allowlist_id: allowlistEntry.id,
          created_at: new Date().toISOString()
        }
      })
      console.log('[signup-with-allowlist] Auditoria registrada')
    } catch (auditError) {
      // Não falhar por erro de auditoria
      console.error('[signup-with-allowlist] Erro ao registrar auditoria:', auditError)
    }

    // ========================================
    // SUCESSO
    // ========================================
    console.log(`[signup-with-allowlist] Conta criada com sucesso: ${normalizedEmail}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta criada com sucesso! Faça login para continuar.',
        user_id: authData.user.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[signup-with-allowlist] Erro inesperado:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor. Tente novamente.' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
