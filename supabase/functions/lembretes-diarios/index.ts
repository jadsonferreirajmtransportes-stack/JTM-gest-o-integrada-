// ============================================================================
// Edge Function: lembretes-diarios
//
// Envio automático de e-mail — sem ninguém precisar clicar em nada — pra
// compromissos da Agenda de Gestão e prazos de Projetos Gerenciais que
// estejam a 1 dia ou chegando hoje. Complementa (não substitui) os disparos
// manuais já existentes (AgendaAlertaModal / ProjetoResumoModal), que
// continuam funcionando do jeito que sempre funcionaram.
//
// Feita pra rodar 1x por dia via agendamento (ver instruções de deploy no
// final do arquivo) — não tem chamador humano, por isso é deployada com
// --no-verify-jwt (não faz sentido exigir login de usuário numa rotina que
// só o próprio Supabase aciona) e usa a service_role (só existe aqui dentro,
// nunca no navegador) pra ignorar RLS e enxergar todos os registros.
//
// Cada compromisso/projeto ganha até 2 e-mails: um na véspera e um no dia —
// as colunas lembrete_vespera_enviado_em/lembrete_dia_enviado_em (migração
// 039) marcam o que já foi mandado, pra rodar todo dia sem duplicar envio.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ASSINATURA =
  'JOBSON DE MORAES TRANSPORTES | Segurança, Rastreabilidade e Pontualidade na Logística da Saúde';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Brasil não observa horário de verão desde 2019 — deslocamento fixo de -3h,
// sem precisar de biblioteca de timezone só pra achar "qual é o dia de hoje/
// amanhã no horário de Brasília" a partir do relógio UTC do servidor.
function dataBRT(offsetDias: number): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000 + offsetDias * 24 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Mesmo critério de correspondência nome → contato já usado no AgendaAlertaModal/
 *  ProjetoResumoModal (resolvePessoasEnvolvidas*, no lado do navegador) — igualdade ou
 *  substring em qualquer direção contra Supervisores (prioridade) e Colaboradores. */
function encontrarEmail(
  nomeStr: string,
  colaboradores: { nome_completo: string; email: string | null }[],
  supervisores: { nome: string; email: string | null }[]
): string | undefined {
  const clean = normalize(nomeStr || '');
  if (!clean) return undefined;

  const sup = supervisores.find((s) => {
    const n = normalize(s.nome || '');
    return n && (n === clean || n.includes(clean) || clean.includes(n));
  });
  if (sup?.email) return sup.email;

  const colab = colaboradores.find((c) => {
    const n = normalize(c.nome_completo || '');
    return n && (n === clean || n.includes(clean) || clean.includes(n));
  });
  if (colab?.email) return colab.email;

  if (clean.includes('@')) return nomeStr.trim();
  return undefined;
}

async function enviarEmail(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  text: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend respondeu ${res.status}: ${body}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    if (!resendApiKey) {
      return jsonResponse(
        { error: 'RESEND_API_KEY não configurada. Rode: supabase secrets set RESEND_API_KEY=... --project-ref <ref>' },
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const hoje = dataBRT(0);
    const amanha = dataBRT(1);

    const [{ data: colaboradores }, { data: supervisores }] = await Promise.all([
      admin.from('colaboradores').select('nome_completo, email'),
      admin.from('supervisores').select('nome, email'),
    ]);
    const colabs = colaboradores || [];
    const sups = supervisores || [];

    const resolverEmails = (nomes: string[]): string[] => {
      const emails = new Set<string>();
      for (const nome of nomes) {
        if (!nome) continue;
        const email = encontrarEmail(nome, colabs, sups);
        if (email) emails.add(email);
      }
      return Array.from(emails);
    };

    let atividadesNotificadas = 0;
    let projetosNotificados = 0;
    const erros: string[] = [];

    // ---- Agenda de Gestão ----
    const { data: atividades, error: errAtiv } = await admin
      .from('atividades_gestao')
      .select('*')
      .not('status', 'in', '("Concluída","Cancelada","Adiada")')
      .or(
        `and(data.eq.${amanha},lembrete_vespera_enviado_em.is.null),and(data.eq.${hoje},lembrete_dia_enviado_em.is.null)`
      );
    if (errAtiv) erros.push(`atividades_gestao: ${errAtiv.message}`);

    for (const a of atividades || []) {
      const isVespera = a.data === amanha;
      const nomes = [a.responsavel, ...(Array.isArray(a.participantes) ? a.participantes : [])];
      const destinatarios = resolverEmails(nomes);
      if (destinatarios.length === 0) continue;

      const quando = isVespera ? 'amanhã' : 'hoje';
      const timeStr = a.dia_inteiro ? 'Dia Inteiro' : `${a.hora_inicio} às ${a.hora_fim}`;
      const subject = `[Lembrete Automático JMT] ${isVespera ? 'AMANHÃ' : 'HOJE'}: ${a.titulo} - ${formatDateBR(a.data)}`;
      const body = [
        'Prezados(as),',
        '',
        `Lembrete automático da Agenda de Gestão da JMT Transportes — este compromisso está marcado para ${quando}:`,
        '',
        `• Atividade: ${a.titulo}`,
        `• Categoria: ${a.categoria}`,
        `• Data: ${formatDateBR(a.data)}`,
        `• Horário: ${timeStr}`,
        `• Local: ${a.local_ou_link || '—'}`,
        `• Responsável: ${a.responsavel}${a.responsavel_cargo ? ` (${a.responsavel_cargo})` : ''}`,
        a.participantes?.length ? `• Participantes: ${a.participantes.join(', ')}` : '',
        '',
        '-------------------------------------------------------',
        ASSINATURA,
      ]
        .filter(Boolean)
        .join('\n');

      try {
        await enviarEmail(resendApiKey, fromEmail, destinatarios, subject, body);
        const patch = isVespera
          ? { lembrete_vespera_enviado_em: new Date().toISOString() }
          : { lembrete_dia_enviado_em: new Date().toISOString() };
        await admin.from('atividades_gestao').update(patch).eq('id', a.id);
        atividadesNotificadas++;
      } catch (e) {
        erros.push(`atividade ${a.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ---- Projetos Gerenciais ----
    const { data: projetos, error: errProj } = await admin
      .from('projetos_gerenciais')
      .select('*')
      .not('status', 'in', '("Concluído","Cancelado","Pausado")')
      .or(
        `and(data_previsao_fim.eq.${amanha},lembrete_vespera_enviado_em.is.null),and(data_previsao_fim.eq.${hoje},lembrete_dia_enviado_em.is.null)`
      );
    if (errProj) erros.push(`projetos_gerenciais: ${errProj.message}`);

    for (const p of projetos || []) {
      const isVespera = p.data_previsao_fim === amanha;
      const nomes = [p.lider_projeto_nome, ...(Array.isArray(p.equipe_membros) ? p.equipe_membros : [])];
      const destinatarios = resolverEmails(nomes);
      if (destinatarios.length === 0) continue;

      const quando = isVespera ? 'amanhã' : 'hoje';
      const subject = `[Lembrete Automático JMT Projetos] Prazo ${quando}: ${p.codigo} - ${p.titulo} (${p.progresso_percentual}%)`;
      const body = [
        'Prezados(as),',
        '',
        `Lembrete automático: o prazo previsto deste projeto gerencial é ${quando} (${formatDateBR(p.data_previsao_fim)}).`,
        '',
        `• Código: ${p.codigo}`,
        `• Título: ${p.titulo}`,
        `• Status: ${p.status}`,
        `• Progresso: ${p.progresso_percentual}%`,
        `• Líder: ${p.lider_projeto_nome}${p.lider_cargo ? ` (${p.lider_cargo})` : ''}`,
        p.equipe_membros?.length ? `• Equipe: ${p.equipe_membros.join(', ')}` : '',
        '',
        '-------------------------------------------------------',
        ASSINATURA,
      ]
        .filter(Boolean)
        .join('\n');

      try {
        await enviarEmail(resendApiKey, fromEmail, destinatarios, subject, body);
        const patch = isVespera
          ? { lembrete_vespera_enviado_em: new Date().toISOString() }
          : { lembrete_dia_enviado_em: new Date().toISOString() };
        await admin.from('projetos_gerenciais').update(patch).eq('id', p.id);
        projetosNotificados++;
      } catch (e) {
        erros.push(`projeto ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return jsonResponse({ ok: true, atividadesNotificadas, projetosNotificados, erros });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ============================================================================
// Deploy (rodar uma vez pra cada projeto — dev e produção):
//
// 1. Rode a migração 039_lembretes_automaticos.sql no SQL Editor do Supabase
//    (dev e produção), se ainda não rodou.
//
// 2. Crie uma conta em https://resend.com (grátis até 3.000 e-mails/mês).
//    - Pra mandar pra QUALQUER e-mail da empresa (não só o seu próprio),
//      você precisa verificar um domínio seu (ex: jmtransportes.com.br) em
//      Resend > Domains — adiciona uns registros DNS, é rápido. Sem isso, o
//      remetente padrão "onboarding@resend.dev" só entrega pro e-mail da
//      sua própria conta Resend (limitação do plano grátis, não é bug).
//    - Gere uma API Key em Resend > API Keys.
//
// 3. Configure os segredos desta função (troque <ref> pelo ID do projeto,
//    visível na URL do painel do Supabase):
//    supabase secrets set RESEND_API_KEY=re_xxx --project-ref <ref>
//    supabase secrets set RESEND_FROM_EMAIL="JMT <lembretes@seudominio.com.br>" --project-ref <ref>
//
// 4. Deploy da função (--no-verify-jwt porque ninguém "loga" pra chamar
//    isso — só o agendamento do próprio Supabase aciona):
//    supabase functions deploy lembretes-diarios --no-verify-jwt --project-ref <ref>
//
//    Alternativa sem CLI: painel do Supabase > Edge Functions > Create a new
//    function > cole este arquivo > Deploy (desmarque "Verify JWT" nas
//    opções). Os segredos (passo 3) têm um formulário próprio na mesma tela.
//
// 5. Agende a execução diária — painel do Supabase > Edge Functions >
//    lembretes-diarios > aba "Cron" (se disponível na sua versão do painel):
//    schedule sugerido "0 10 * * *" (10:00 UTC = 07:00 em Brasília).
//
//    Se seu painel não tiver a aba "Cron" ainda, use pg_cron + pg_net (SQL
//    Editor, rodar uma vez): troque <ref> e <SERVICE_ROLE_KEY> pelos seus.
//
//    create extension if not exists pg_cron;
//    create extension if not exists pg_net;
//    select cron.schedule(
//      'lembretes-diarios',
//      '0 10 * * *',
//      $$
//      select net.http_post(
//        url := 'https://<ref>.supabase.co/functions/v1/lembretes-diarios',
//        headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
//      );
//      $$
//    );
//
// 6. Teste manual (não precisa esperar o cron): painel do Supabase > Edge
//    Functions > lembretes-diarios > "Invoke" — o retorno mostra quantos
//    e-mails foram enviados e qualquer erro.
// ============================================================================
