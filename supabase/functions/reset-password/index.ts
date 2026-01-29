import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Admin client for password updates
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { action, token, newPassword } = await req.json()

    // Get IP and User Agent for logging
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    if (action === 'use_token') {
      // Validate inputs
      if (!token || typeof token !== 'string' || token.length !== 64) {
        console.log('[reset-password] Invalid token format')
        return new Response(
          JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        console.log('[reset-password] Invalid password format')
        return new Response(
          JSON.stringify({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log(`[reset-password] Attempting token validation from IP: ${ipAddress}`)

      // Use database function to validate and consume token
      const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc('use_recovery_token', {
        p_token: token,
        p_new_password: newPassword,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })

      if (tokenError) {
        console.error('[reset-password] Token validation error:', tokenError)
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao processar solicitação' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (!tokenResult?.success) {
        console.log('[reset-password] Token validation failed:', tokenResult?.error)
        return new Response(
          JSON.stringify({ success: false, error: tokenResult?.error || 'Token inválido ou expirado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Token is valid, update password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        tokenResult.user_id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('[reset-password] Password update error:', updateError)
        
        // Log failure in audit
        await supabaseAdmin.from('password_recovery_audit').insert({
          user_id: tokenResult.user_id,
          action: 'password_update_failed',
          ip_address: ipAddress,
          user_agent: userAgent,
          details: { error: updateError.message }
        })

        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao atualizar senha. Tente novamente.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Invalidate all existing sessions for this user
      const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
        tokenResult.user_id,
        'global'
      )

      if (signOutError) {
        console.warn('[reset-password] Failed to invalidate sessions:', signOutError)
      }

      console.log(`[reset-password] Password successfully reset for user: ${tokenResult.email}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Senha alterada com sucesso! Faça login com sua nova senha.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('[reset-password] Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
