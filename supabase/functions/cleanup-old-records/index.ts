import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const retentionDays = parseInt(Deno.env.get('RETENTION_DAYS') ?? '30')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
    const tables = ['tickets', 'logs', 'notifications']
    const results: Record<string, string> = {}

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .lt('created_at', cutoffDate)

      results[table] = error ? `error: ${error.message}` : 'ok'
    }

    return new Response(
      JSON.stringify({ cutoff: cutoffDate, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ error: 'Cleanup failed', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
