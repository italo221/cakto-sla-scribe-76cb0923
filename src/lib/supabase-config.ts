// Configuração do Supabase - Verificação Automática
// Este arquivo verifica se o Supabase foi configurado corretamente

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  error?: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  // Verificar se estamos em ambiente Lovable com Supabase integrado
  const integratedUrl = "https://hnqsgjblwuffgpksfyyh.supabase.co";
  const integratedKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucXNnamJsd3VmZmdwa3NmeXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTE4MzUsImV4cCI6MjA2ODAyNzgzNX0.zQEBVwXDClAfZDvefRBKCRKF_ux-GEfzd1QV5iOaxyE";

  // Verificar se há configurações customizadas (para projetos clonados)
  const customUrl = process.env.SUPABASE_URL || 
                   (window as any).__SUPABASE_URL__ || 
                   localStorage.getItem('supabase_url');
                   
  const customKey = process.env.SUPABASE_ANON_KEY || 
                   (window as any).__SUPABASE_ANON_KEY__ || 
                   localStorage.getItem('supabase_anon_key');

  // Se há configurações customizadas, usar elas
  if (customUrl && customKey) {
    return {
      url: customUrl,
      anonKey: customKey,
      isConfigured: true
    };
  }

  // Se não há configurações customizadas, usar as integradas (Lovable)
  if (integratedUrl && integratedKey) {
    return {
      url: integratedUrl,
      anonKey: integratedKey,
      isConfigured: true
    };
  }

  // Se não há nenhuma configuração válida
  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    error: 'Supabase não configurado. Siga o passo a passo de instalação no README para ativar seu banco.'
  };
}

export function testSupabaseConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    const config = getSupabaseConfig();
    
    if (!config.isConfigured) {
      resolve(false);
      return;
    }

    // Teste simples de conectividade
    fetch(`${config.url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    })
    .then(response => resolve(response.ok))
    .catch(() => resolve(false));
  });
}

export function showSetupInstructions(): string {
  return `
⚠️ Supabase não configurado. Siga o passo a passo de instalação no README para ativar seu banco.

📋 Passos rápidos:
1. Criar conta em https://supabase.com
2. Criar novo projeto
3. Executar o script SQL fornecido
4. Copiar URL e anon key
5. Configurar no projeto

Para mais detalhes, consulte o README.md
  `.trim();
}