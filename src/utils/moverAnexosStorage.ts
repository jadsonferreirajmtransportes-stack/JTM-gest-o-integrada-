// ============================================================================
// Ferramenta de manutenção: move os anexos antigos (base64 "data:..." gravados
// dentro das tabelas) para o Supabase Storage (bucket "anexos"), trocando o
// campo pela referência curta "storage:<caminho>" — o mesmo formato dos anexos
// novos (ver arquivosStorage.ts). As telas já abrem os dois formatos.
//
// Tabelas cobertas (as mais pesadas): colaboradores (ASO e dossiê de anexos),
// chat_mensagens (anexo da mensagem) e projetos_gerenciais (documentos).
// Uma linha por vez: envia o arquivo, grava a referência; se a gravação falhar,
// apaga o arquivo enviado. Pode rodar de novo — só mexe no que ainda é base64.
// ============================================================================

import { supabase } from './supabaseClient';
import { enviarArquivo, removerArquivo } from './arquivosStorage';

export interface ProgressoMudanca {
  tabela: string;
  feitos: number;
  total: number;
  arquivos: number;
  bytes: number;
  erros: string[];
}

const ehBase64 = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:') && v.includes(';base64,');

function extensaoDe(tipo: string): string {
  const m: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return m[tipo] || tipo.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
}

/** "data:image/png;base64,AAAA" → File. */
function dataUrlParaArquivo(dataUrl: string, nomeSugerido?: string): File {
  const virgula = dataUrl.indexOf(',');
  const tipo = dataUrl.slice(5, dataUrl.indexOf(';')) || 'application/octet-stream';
  const bin = atob(dataUrl.slice(virgula + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let nome = (nomeSugerido || 'arquivo').trim() || 'arquivo';
  if (!/\.[a-z0-9]{2,5}$/i.test(nome)) nome = `${nome}.${extensaoDe(tipo)}`;
  return new File([bytes], nome, { type: tipo });
}

async function subir(dataUrl: string, nome: string | undefined, pasta: string, p: ProgressoMudanca): Promise<string> {
  const arq = dataUrlParaArquivo(dataUrl, nome);
  const ref = await enviarArquivo(arq, pasta);
  p.arquivos += 1;
  p.bytes += arq.size;
  return ref;
}

async function ids(tabela: string, filtro?: (q: any) => any): Promise<string[]> {
  const todos: string[] = [];
  for (let de = 0; ; de += 1000) {
    let q = supabase.from(tabela).select('id');
    if (filtro) q = filtro(q);
    const { data, error } = await q.range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    todos.push(...(data ?? []).map((r: any) => r.id));
    if (!data || data.length < 1000) break;
  }
  return todos;
}

type Avisar = (p: ProgressoMudanca) => void;

async function moverColaboradores(avisar: Avisar): Promise<ProgressoMudanca> {
  const lista = await ids('colaboradores');
  const p: ProgressoMudanca = { tabela: 'Colaboradores (ASO e dossiê)', feitos: 0, total: lista.length, arquivos: 0, bytes: 0, erros: [] };
  for (const id of lista) {
    const enviados: string[] = [];
    try {
      const { data: r, error } = await supabase.from('colaboradores').select('id, nome_completo, aso_imagem_url, aso_nome_arquivo, anexos').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!r) continue;
      const patch: Record<string, unknown> = {};
      if (ehBase64(r.aso_imagem_url)) {
        patch.aso_imagem_url = await subir(r.aso_imagem_url, r.aso_nome_arquivo || 'aso', 'dp/colaboradores', p);
        enviados.push(patch.aso_imagem_url as string);
      }
      if (Array.isArray(r.anexos) && r.anexos.some((a: any) => ehBase64(a?.arquivoUrl))) {
        const novos = [];
        for (const a of r.anexos) {
          if (ehBase64(a?.arquivoUrl)) {
            const ref = await subir(a.arquivoUrl, a.nome, 'dp/colaboradores', p);
            enviados.push(ref);
            novos.push({ ...a, arquivoUrl: ref });
          } else novos.push(a);
        }
        patch.anexos = novos;
      }
      if (Object.keys(patch).length) {
        const { error: e2 } = await supabase.from('colaboradores').update(patch).eq('id', id);
        if (e2) throw new Error(e2.message);
      }
    } catch (e) {
      await Promise.all(enviados.map((ref) => removerArquivo(ref).catch(() => undefined)));
      p.erros.push(`Colaborador ${id}: ${e instanceof Error ? e.message : 'erro'}`);
    }
    p.feitos += 1;
    avisar({ ...p });
  }
  return p;
}

async function moverChat(avisar: Avisar): Promise<ProgressoMudanca> {
  const lista = await ids('chat_mensagens', (q) => q.like('anexo_url', 'data:%'));
  const p: ProgressoMudanca = { tabela: 'Chat (anexos das mensagens)', feitos: 0, total: lista.length, arquivos: 0, bytes: 0, erros: [] };
  for (const id of lista) {
    let ref: string | undefined;
    try {
      const { data: r, error } = await supabase.from('chat_mensagens').select('id, anexo_url, anexo_nome').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (r && ehBase64(r.anexo_url)) {
        ref = await subir(r.anexo_url, r.anexo_nome || 'anexo', 'chat/anexos', p);
        const { error: e2 } = await supabase.from('chat_mensagens').update({ anexo_url: ref }).eq('id', id);
        if (e2) throw new Error(e2.message);
      }
    } catch (e) {
      if (ref) await removerArquivo(ref).catch(() => undefined);
      p.erros.push(`Mensagem ${id}: ${e instanceof Error ? e.message : 'erro'}`);
    }
    p.feitos += 1;
    avisar({ ...p });
  }
  return p;
}

async function moverProjetos(avisar: Avisar): Promise<ProgressoMudanca> {
  const lista = await ids('projetos_gerenciais');
  const p: ProgressoMudanca = { tabela: 'Projetos (documentos)', feitos: 0, total: lista.length, arquivos: 0, bytes: 0, erros: [] };
  for (const id of lista) {
    const enviados: string[] = [];
    try {
      const { data: r, error } = await supabase.from('projetos_gerenciais').select('id, documentos').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      const docs: any[] = Array.isArray(r?.documentos) ? r!.documentos : [];
      if (docs.some((d) => ehBase64(d?.arquivoUrl) || ehBase64(d?.url))) {
        const novos = [];
        for (const d of docs) {
          const base = ehBase64(d?.arquivoUrl) ? d.arquivoUrl : ehBase64(d?.url) ? d.url : null;
          if (!base) {
            novos.push(d);
            continue;
          }
          const ref = await subir(base, d.nome, 'projetos', p);
          enviados.push(ref);
          // Tira a cópia em dobro (url = arquivoUrl) que anexos antigos tinham.
          const { url: _u, ...resto } = d;
          novos.push({ ...resto, arquivoUrl: ref, ...(d.url && !ehBase64(d.url) ? { url: d.url } : {}) });
        }
        const { error: e2 } = await supabase.from('projetos_gerenciais').update({ documentos: novos }).eq('id', id);
        if (e2) throw new Error(e2.message);
      }
    } catch (e) {
      await Promise.all(enviados.map((ref) => removerArquivo(ref).catch(() => undefined)));
      p.erros.push(`Projeto ${id}: ${e instanceof Error ? e.message : 'erro'}`);
    }
    p.feitos += 1;
    avisar({ ...p });
  }
  return p;
}

/** Roda as três etapas em sequência, avisando o progresso. */
export async function moverAnexosAntigos(avisar: (etapas: ProgressoMudanca[]) => void): Promise<ProgressoMudanca[]> {
  const feitas: ProgressoMudanca[] = [];
  for (const etapa of [moverColaboradores, moverChat, moverProjetos]) {
    const r = await etapa((p) => avisar([...feitas, p]));
    feitas.push(r);
    avisar([...feitas]);
  }
  return feitas;
}
