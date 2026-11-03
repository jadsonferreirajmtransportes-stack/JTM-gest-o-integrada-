// ============================================================================
// Supabase Edge Function "enviar-push" — notificações no celular dos apps JMT.
//
// Chamada:
//   { evento: 'chave' }                       → devolve a chave pública (o app usa pra se inscrever)
//   { evento: 'documento'|'comunicado'|'noticia'|'chat'|'solicitacao'|'qualidade', id } → chamado pelos gatilhos do banco (078/079/093)
//   { evento: 'ponto_lembrete', id } → a cada 5 min pelo agendamento do banco (097): lembra de bater o ponto
//
// Na primeira execução cria as chaves VAPID e guarda em push_config, junto com o
// próprio endereço (os gatilhos usam). Ninguém precisa digitar chave nenhuma.
// Só reenvia o que acabou de acontecer (registro com menos de 15 min) e nunca o
// mesmo aviso duas vezes (push_enviados) — chamar a função "na mão" não faz spam.
//
// Publicar no painel do Supabase: Edge Functions → Deploy a new function → Via
// editor → nome "enviar-push" → colar este arquivo → Deploy; depois, em
// Details/Settings, DESLIGAR "Enforce JWT verification" (os gatilhos e o app
// chamam sem login).
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const RECENTE_MS = 15 * 60 * 1000;
const recente = (iso?: string | null) => !!iso && Date.now() - Date.parse(iso) < RECENTE_MS;

interface Aviso {
  titulo: string;
  corpo: string;
  url: string;
  tag?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const urlProjeto = Deno.env.get('SUPABASE_URL')!;
  const sb = createClient(urlProjeto, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { evento, id } = await req.json().catch(() => ({} as any));

  // Chaves VAPID (criadas uma vez) + endereço desta função para os gatilhos.
  const enderecoFuncao = `${urlProjeto}/functions/v1/enviar-push`;
  let { data: cfg } = await sb.from('push_config').select('*').eq('id', 1).maybeSingle();
  if (!cfg?.vapid_publica || !cfg?.vapid_privada) {
    const chaves = webpush.generateVAPIDKeys();
    cfg = { id: 1, vapid_publica: chaves.publicKey, vapid_privada: chaves.privateKey, funcao_url: enderecoFuncao };
    await sb.from('push_config').upsert(cfg);
  } else if (cfg.funcao_url !== enderecoFuncao) {
    await sb.from('push_config').update({ funcao_url: enderecoFuncao, atualizado_em: new Date().toISOString() }).eq('id', 1);
  }
  if (evento === 'chave') return resposta({ chave: cfg.vapid_publica });
  if (!evento || !id) return resposta({ erro: 'parametros' }, 400);

  if (evento === 'ponto_lembrete') return resposta(await lembretesPonto(sb, cfg));

  // Monta o aviso e quem recebe.
  let aviso: Aviso | null = null;
  let inscricoes: { endpoint: string; p256dh: string; auth: string }[] = [];
  const colunas = 'endpoint, p256dh, auth';

  if (evento === 'documento') {
    const { data: d } = await sb.from('documentos_assinatura').select('id, colaborador_id, titulo, criado_em').eq('id', id).maybeSingle();
    if (!d || !recente(d.criado_em)) return resposta({ ok: true, ignorado: true });
    aviso = { titulo: '📄 Documento para assinar', corpo: d.titulo, url: `/colaborador/?form=portal&ir=documento:${d.id}`, tag: `doc-${d.id}` };
    inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'colaborador').eq('colaborador_id', d.colaborador_id)).data ?? [];
  } else if (evento === 'comunicado') {
    const { data: d } = await sb.from('comunicado_destinatarios').select('id, ref_id, tipo, comunicados(titulo, criado_em)').eq('id', id).maybeSingle();
    const c: any = (d as any)?.comunicados;
    if (!d || d.tipo !== 'colaborador' || !d.ref_id || !recente(c?.criado_em)) return resposta({ ok: true, ignorado: true });
    aviso = { titulo: '📢 Novo comunicado', corpo: c.titulo, url: `/colaborador/?form=portal&ir=comunicado:${d.id}`, tag: `com-${d.id}` };
    inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'colaborador').eq('colaborador_id', d.ref_id)).data ?? [];
  } else if (evento === 'noticia') {
    const { data: n } = await sb.from('noticias').select('id, titulo, status, publicada_em, atualizado_em').eq('id', id).maybeSingle();
    if (!n || n.status !== 'publicada' || !recente(n.atualizado_em || n.publicada_em)) return resposta({ ok: true, ignorado: true });
    aviso = { titulo: '📰 Jornal JMT', corpo: n.titulo, url: `/colaborador/?form=portal&ir=jornal:${n.id}`, tag: `jornal-${n.id}` };
    inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'colaborador')).data ?? [];
  } else if (evento === 'chat') {
    const { data: m } = await sb.from('chat_mensagens').select('id, conversa_id, autor_id, texto, anexo_tipo, criado_em').eq('id', id).maybeSingle();
    if (!m || !recente(m.criado_em)) return resposta({ ok: true, ignorado: true });
    const [{ data: conv }, { data: autor }, { data: part }] = await Promise.all([
      sb.from('chat_conversas').select('tipo, nome').eq('id', m.conversa_id).maybeSingle(),
      sb.from('usuarios').select('nome').eq('id', m.autor_id).maybeSingle(),
      sb.from('chat_participantes').select('usuario_id').eq('conversa_id', m.conversa_id).neq('usuario_id', m.autor_id),
    ]);
    const nomeAutor = autor?.nome || 'Alguém';
    const conteudo = m.texto?.trim()
      ? m.texto.trim().slice(0, 140)
      : String(m.anexo_tipo || '').startsWith('audio/')
        ? '🎤 Áudio'
        : String(m.anexo_tipo || '').startsWith('image/')
          ? '📷 Imagem'
          : '📎 Anexo';
    const grupo = conv?.tipo === 'grupo';
    aviso = {
      titulo: grupo ? `💬 ${conv?.nome || 'Grupo'}` : `💬 ${nomeAutor}`,
      corpo: grupo ? `${nomeAutor.split(' ')[0]}: ${conteudo}` : conteudo,
      url: '/gestao/?abrir=chat',
      tag: `chat-${m.conversa_id}`,
    };
    const ids = (part ?? []).map((p: any) => p.usuario_id);
    if (ids.length) inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'usuario').in('usuario_id', ids)).data ?? [];
  } else if (evento === 'solicitacao') {
    // Mensagem numa demanda do "Fale com o DP" (079): do colaborador → avisa a gestão
    // (quem tem o módulo DP com a seção "Fale com o DP"); do DP → avisa o colaborador.
    const { data: m } = await sb.from('solicitacao_mensagens').select('id, solicitacao_id, autor, texto, anexos, criado_em').eq('id', id).maybeSingle();
    if (!m || !recente(m.criado_em)) return resposta({ ok: true, ignorado: true });
    const { data: s } = await sb.from('solicitacoes_dp').select('id, colaborador_id, colaborador_nome, assunto').eq('id', m.solicitacao_id).maybeSingle();
    if (!s) return resposta({ ok: true, ignorado: true });
    const conteudo = m.texto?.trim() ? m.texto.trim().slice(0, 140) : '📎 Anexo';
    if (m.autor === 'colaborador') {
      const primeiroNome = String(s.colaborador_nome || 'Colaborador').split(' ')[0];
      aviso = { titulo: `🗂️ Fale com o DP · ${primeiroNome}`, corpo: `${s.assunto}: ${conteudo}`, url: '/gestao/?abrir=chat', tag: `sol-${s.id}` };
      const { data: usuarios } = await sb.from('usuarios').select('id, status, modulos_permitidos, secoes_dp_permitidas');
      const ids = (usuarios ?? [])
        .filter((u: any) => u.status !== 'Inativo' && u.status !== 'Bloqueado')
        .filter((u: any) => Array.isArray(u.modulos_permitidos) && u.modulos_permitidos.includes('dp'))
        .filter((u: any) => !Array.isArray(u.secoes_dp_permitidas) || u.secoes_dp_permitidas.length === 0 || u.secoes_dp_permitidas.includes('solicitacoes'))
        .map((u: any) => u.id);
      if (ids.length) inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'usuario').in('usuario_id', ids)).data ?? [];
    } else {
      aviso = { titulo: '💬 Resposta do DP', corpo: `${s.assunto}: ${conteudo}`, url: `/colaborador/?form=portal&ir=solicitacao:${s.id}`, tag: `sol-${s.id}` };
      inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'colaborador').eq('colaborador_id', s.colaborador_id)).data ?? [];
    }
  } else if (evento === 'qualidade') {
    // Ocorrência relatada pelo colaborador no portal (093) → avisa quem tem o módulo Qualidade
    // (e os administradores).
    const { data: q } = await sb.from('qualidade_registros').select('id, ano, numero, origem, dados, criado_em').eq('id', id).maybeSingle();
    if (!q || q.origem !== 'portal' || !recente(q.criado_em)) return resposta({ ok: true, ignorado: true });
    const d: any = q.dados || {};
    const protocolo = `DSV-${q.ano}-${String(q.numero || 0).padStart(3, '0')}`;
    aviso = {
      titulo: `⚠️ Qualidade · ${d.categoria || 'Nova ocorrência'}`,
      corpo: `${protocolo}: ${String(d.descricao || '').trim().slice(0, 140)}`,
      url: '/gestao/?abrir=qualidade',
      tag: `qld-${q.id}`,
    };
    const { data: usuarios } = await sb.from('usuarios').select('id, status, role, modulos_permitidos');
    const ids = (usuarios ?? [])
      .filter((u: any) => u.status !== 'Inativo' && u.status !== 'Bloqueado')
      .filter((u: any) => u.role === 'admin' || (Array.isArray(u.modulos_permitidos) && u.modulos_permitidos.includes('qualidade')))
      .map((u: any) => u.id);
    if (ids.length) inscricoes = (await sb.from('push_inscricoes').select(colunas).eq('tipo', 'usuario').in('usuario_id', ids)).data ?? [];
  } else {
    return resposta({ erro: 'evento' }, 400);
  }

  if (!aviso || !inscricoes.length) return resposta({ ok: true, enviados: 0 });

  // Nunca o mesmo aviso duas vezes.
  const { error: repetido } = await sb.from('push_enviados').insert({ evento, ref_id: String(id) });
  if (repetido) return resposta({ ok: true, repetido: true });

  webpush.setVapidDetails('mailto:contato@jmtransportes.com.br', cfg.vapid_publica, cfg.vapid_privada);
  let enviados = 0;
  const expiradas: string[] = [];
  await Promise.all(
    inscricoes.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 24 });
        enviados++;
      } catch (err: any) {
        // Aparelho desinstalou o app / desativou os avisos: limpa a inscrição.
        if (err?.statusCode === 404 || err?.statusCode === 410) expiradas.push(s.endpoint);
        else console.error('Falha ao enviar push:', err?.statusCode, err?.body || err?.message);
      }
    })
  );
  if (expiradas.length) await sb.from('push_inscricoes').delete().in('endpoint', expiradas);
  return resposta({ ok: true, enviados });
});

// ---------------------------------------------------------------------------
// Lembrete de bater o ponto (097). Roda a cada 5 minutos. Para cada colaborador com
// jornada e o aviso ativado no celular: 5 min antes de cada marcação e, se passar da
// tolerância sem a batida, um aviso de "não registrado". Pula folga, feriado, dia com
// justificativa (atestado, abono, férias...) e quem está de férias, afastado ou inativo.
// Horário de Fortaleza/Natal (UTC-3, sem horário de verão).
// ---------------------------------------------------------------------------
async function lembretesPonto(sb: any, cfg: any) {
  const MIN = 60 * 1000;
  const agora = Date.now();
  const diaLocal = (ms: number) => new Date(ms - 3 * 60 * MIN).toISOString().slice(0, 10);
  const hoje = diaLocal(agora);
  const ontem = diaLocal(agora - 24 * 60 * MIN);

  const { data: inscricoes } = await sb.from('push_inscricoes').select('endpoint, p256dh, auth, colaborador_id').eq('tipo', 'colaborador');
  const porColab = new Map<string, any[]>();
  (inscricoes ?? []).forEach((i: any) => i.colaborador_id && porColab.set(i.colaborador_id, [...(porColab.get(i.colaborador_id) || []), i]));
  if (!porColab.size) return { ok: true, enviados: 0 };
  const ids = Array.from(porColab.keys());

  const [{ data: vinculos }, { data: jornadas }, { data: colabs }, { data: feriados }, { data: justif }, { data: batidas }] = await Promise.all([
    sb.from('ponto_colaborador_jornada').select('colaborador_id, jornada_id').in('colaborador_id', ids),
    sb.from('ponto_jornadas').select('*').eq('ativo', true),
    sb.from('colaboradores').select('id, status').in('id', ids),
    sb.from('feriados_empresa').select('data, tipo').in('data', [hoje, ontem]),
    sb.from('ponto_justificativas').select('colaborador_id, data').in('colaborador_id', ids).in('data', [hoje, ontem]),
    sb.from('ponto_registros').select('colaborador_id, registrado_em').in('colaborador_id', ids).eq('anulado', false).gte('registrado_em', new Date(agora - 30 * 60 * MIN).toISOString()),
  ]);
  const jornadaPorId = new Map((jornadas ?? []).map((j: any) => [j.id, j]));
  const statusPorColab = new Map((colabs ?? []).map((c: any) => [c.id, c.status]));
  const ehFeriado = new Set((feriados ?? []).filter((f: any) => f.tipo !== 'Ponto Facultativo').map((f: any) => f.data));
  const justificado = new Set((justif ?? []).map((j: any) => `${j.colaborador_id}|${j.data}`));
  const minutos = (h?: string | null) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : null);
  const hhmm = (h: string) => h.slice(0, 5);

  webpush.setVapidDetails('mailto:contato@jmtransportes.com.br', cfg.vapid_publica, cfg.vapid_privada);
  let enviados = 0;
  const expiradas: string[] = [];

  for (const v of vinculos ?? []) {
    const j: any = jornadaPorId.get(v.jornada_id);
    const status = statusPorColab.get(v.colaborador_id);
    if (!j || !status || ['Inativo', 'Férias', 'Afastado'].includes(status)) continue;
    const marcas = [
      { rotulo: 'entrada', hora: j.entrada },
      ...(j.saida_intervalo && j.volta_intervalo
        ? [
            { rotulo: 'saída para o intervalo', hora: j.saida_intervalo },
            { rotulo: 'volta do intervalo', hora: j.volta_intervalo },
          ]
        : []),
      { rotulo: 'saída', hora: j.saida },
    ].filter((m) => minutos(m.hora) !== null);
    const tolerancia = Math.max(5, Number(j.tolerancia_min ?? 15));

    for (const base of [hoje, ontem]) {
      const dow = new Date(`${base}T12:00:00Z`).getUTCDay();
      if (!(j.dias_semana ?? []).includes(dow) || ehFeriado.has(base) || justificado.has(`${v.colaborador_id}|${base}`)) continue;
      // Horário de cada marcação (jornada que vira a noite: a hora "volta" e vai para o dia seguinte).
      const meiaNoite = Date.parse(`${base}T03:00:00Z`);
      let anterior = -1;
      const tempos = marcas.map((m) => {
        let t = meiaNoite + minutos(m.hora)! * MIN;
        while (t <= anterior) t += 24 * 60 * MIN;
        anterior = t;
        return t;
      });
      const feitas = (batidas ?? []).filter((b: any) => {
        if (b.colaborador_id !== v.colaborador_id) return false;
        const t = Date.parse(b.registrado_em);
        return t >= tempos[0] - 3 * 60 * MIN && t <= tempos[tempos.length - 1] + 4 * 60 * MIN;
      }).length;

      for (let i = 0; i < marcas.length; i++) {
        if (feitas > i) continue; // já bateu esta (contando na ordem)
        let tipo: 'antes' | 'depois' | null = null;
        if (agora >= tempos[i] - 5 * MIN && agora < tempos[i]) tipo = 'antes';
        else if (agora >= tempos[i] + tolerancia * MIN && agora < tempos[i] + (tolerancia + 5) * MIN) tipo = 'depois';
        if (!tipo) continue;
        const { error: repetido } = await sb.from('push_enviados').insert({ evento: 'ponto_lembrete', ref_id: `${v.colaborador_id}|${base}|${i}|${tipo}` });
        if (repetido) continue;
        const aviso =
          tipo === 'antes'
            ? { titulo: '⏰ Hora de bater o ponto', corpo: `Sua ${marcas[i].rotulo} é às ${hhmm(marcas[i].hora)}. Toque para registrar.`, url: '/colaborador/?form=portal&ir=ponto', tag: `ponto-${base}-${i}` }
            : { titulo: '⚠️ Ponto não registrado', corpo: `Você ainda não registrou a ${marcas[i].rotulo} (${hhmm(marcas[i].hora)}). Toque para registrar.`, url: '/colaborador/?form=portal&ir=ponto', tag: `ponto-${base}-${i}` };
        for (const s of porColab.get(v.colaborador_id) || []) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 30 });
            enviados++;
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) expiradas.push(s.endpoint);
            else console.error('Falha ao enviar lembrete de ponto:', err?.statusCode, err?.body || err?.message);
          }
        }
        break; // um aviso por colaborador por rodada
      }
    }
  }
  if (expiradas.length) await sb.from('push_inscricoes').delete().in('endpoint', expiradas);
  // Limpa os registros de lembrete com mais de 3 dias (a tabela não cresce à toa).
  await sb.from('push_enviados').delete().eq('evento', 'ponto_lembrete').lt('enviado_em', new Date(agora - 3 * 24 * 60 * MIN).toISOString());
  return { ok: true, enviados };
}
