// ============================================================================
// Edge Function: convidar-usuario
//
// Único lugar do projeto que usa a service_role do Supabase — e por isso só
// pode rodar aqui (servidor do Supabase), nunca no navegador. A chave em si
// (SUPABASE_SERVICE_ROLE_KEY) é injetada automaticamente pelo Supabase no
// ambiente da função; ninguém digita ou vê o valor dela em lugar nenhum.
//
// O que faz: recebe um e-mail, confere se quem está chamando é um admin de
// verdade (olhando a tabela `usuarios` com a service_role, que ignora RLS) e,
// se for, manda um convite por e-mail (Supabase Auth) pra essa pessoa criar a
// própria senha. Deploy: veja instruções no final do arquivo.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  try {
    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== 'string') {
      return jsonResponse({ error: 'Informe um e-mail válido.' }, 400);
    }

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return jsonResponse({ error: 'Não autenticado.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente "de quem chamou" — só serve pra descobrir quem é a pessoa por trás do token.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
    }

    // Cliente com privilégio total — só existe aqui dentro, nunca sai do servidor.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: perfilCaller, error: perfilError } = await adminClient
      .from('usuarios')
      .select('role, nome')
      .eq('auth_user_id', callerData.user.id)
      .maybeSingle();

    if (perfilError) {
      return jsonResponse({ error: `Erro ao checar permissão: ${perfilError.message}` }, 500);
    }
    if (!perfilCaller || perfilCaller.role !== 'admin') {
      return jsonResponse({ error: 'Só administradores podem convidar novos usuários.' }, 403);
    }

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: redirectTo || undefined,
    });
    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ============================================================================
// Deploy (rodar uma vez pra cada projeto — dev e produção):
//
// 1. Instale a CLI do Supabase (se ainda não tiver): npm install -g supabase
// 2. supabase login                       (abre o navegador, usa sua conta)
// 3. supabase link --project-ref <ref>    (o <ref> aparece na URL do projeto
//                                          no painel do Supabase)
// 4. supabase functions deploy convidar-usuario --project-ref <ref>
//
// Alternativa sem CLI: no painel do Supabase, Edge Functions > Create a new
// function > cole este arquivo > Deploy. Não precisa configurar nenhuma
// variável de ambiente manualmente — SUPABASE_URL, SUPABASE_ANON_KEY e
// SUPABASE_SERVICE_ROLE_KEY já existem automaticamente pra toda função.
// ============================================================================
