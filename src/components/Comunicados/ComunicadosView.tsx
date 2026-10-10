import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Plus,
  Loader2,
  X,
  MessageCircle,
  Mail,
  Download,
  FileText,
  Image as ImageIcon,
  Copy,
  CheckCircle2,
  Eye,
  Clock,
  Trash2,
  Search,
  Users,
  Building2,
} from 'lucide-react';
import { Cliente, Colaborador, UsuarioLogin } from '../../types';
import {
  Comunicado,
  DestinatarioComunicado,
  excluirComunicado,
  getComunicados,
  getDestinatarios,
  marcarEnviado,
  montarLinkComunicado,
  numeroFormatado,
  personalizar,
} from '../../utils/comunicadosApi';
import { EnvioWhatsAppEmMassaModal, ItemEnvioWhatsApp } from '../Common/EnvioWhatsAppEmMassaModal';
import { useLinksUnicos } from '../../utils/linkUnico';
import { baixarBlob } from '../../utils/downloadUtils';
import { NovoComunicadoModal } from './NovoComunicadoModal';
import { gerarPdfComunicado } from './comunicadoPdf';
import { gerarImagemComunicado, textoParaImagem } from './comunicadoImagem';

interface ComunicadosViewProps {
  colaboradores: Colaborador[];
  clientes: Cliente[];
  currentUser?: UsuarioLogin;
}

const dataHora = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Mensagem do WhatsApp/e-mail de UMA pessoa: texto com o nome dela + link próprio. Colaborador
 *  recebe o link único dele (abre direto no comunicado); cliente, o link do comunicado. */
function mensagemPara(c: Comunicado, d: DestinatarioComunicado, formato: 'whatsapp' | 'email', linkPessoal?: string | null): string {
  const link = linkPessoal || montarLinkComunicado(d.token);
  const texto = personalizar(c.corpo, d.nome);
  const chamada = c.exigeCiencia ? 'Confirme que leu pelo link' : 'Veja o comunicado completo';
  if (formato === 'whatsapp') {
    return `*Comunicado nº ${numeroFormatado(c)} — ${c.titulo}*\n\n${texto}\n\n${chamada}:\n${link}\n\n${c.assinatura} — JM Transportes`;
  }
  return `${texto.replace(/\*([^*\n]+)\*/g, '$1')}\n\n${chamada}: ${link}\n\nAtenciosamente,\n${c.assinatura}\nJM Transportes`;
}

function mailto(para: string[], assunto: string, corpo: string, oculto = false): string {
  const destino = oculto ? '' : para.join(',');
  const params = new URLSearchParams();
  if (oculto) params.set('bcc', para.join(','));
  params.set('subject', assunto);
  params.set('body', corpo);
  return `mailto:${destino}?${params.toString().replace(/\+/g, '%20')}`;
}

/** Comunicados padronizados (colaboradores e clientes): texto para WhatsApp/e-mail, imagem nos
 *  modelos JMT, PDF numerado, histórico de envio e ciência por link. */
export const ComunicadosView: React.FC<ComunicadosViewProps> = ({ colaboradores, clientes, currentUser }) => {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [destinatarios, setDestinatarios] = useState<DestinatarioComunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState<Comunicado | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    Promise.all([getComunicados(), getDestinatarios()])
      .then(([cs, ds]) => {
        setComunicados(cs);
        setDestinatarios(ds);
      })
      .catch((err) => {
        console.error(err);
        setErro('Não foi possível carregar os comunicados. Se for a primeira vez, confirme que a migração 063 foi rodada no Supabase.');
      })
      .finally(() => setCarregando(false));
  }, []);

  const porComunicado = useMemo(() => {
    const mapa = new Map<string, DestinatarioComunicado[]>();
    destinatarios.forEach((d) => mapa.set(d.comunicadoId, [...(mapa.get(d.comunicadoId) || []), d]));
    return mapa;
  }, [destinatarios]);

  const visiveis = comunicados.filter((c) => !busca.trim() || `${c.titulo} ${c.categoria} ${numeroFormatado(c)}`.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C48229] to-[#92611F] flex items-center justify-center text-white shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Comunicados</h1>
            <p className="text-xs text-slate-500 mt-0.5">Um comunicado, três formatos no padrão JMT: texto (WhatsApp/e-mail), imagem e PDF — com histórico e ciência.</p>
          </div>
        </div>
        <button type="button" onClick={() => setNovo(true)} className="px-4 py-2.5 bg-[#C48229] hover:bg-[#92611F] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo comunicado
        </button>
      </div>

      {erro && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">{erro}</div>}

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
        </div>
      ) : comunicados.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
          Nenhum comunicado ainda. Clique em <strong>Novo comunicado</strong>.
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar comunicado" className="w-full pl-8 p-2 border border-slate-200 rounded-lg text-xs bg-white" />
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visiveis.map((c) => {
              const ds = porComunicado.get(c.id) || [];
              const enviados = ds.filter((d) => d.enviadoEm).length;
              const vistos = ds.filter((d) => d.visualizadoEm).length;
              const cientes = ds.filter((d) => d.cienteEm).length;
              return (
                <button key={c.id} type="button" onClick={() => setAberto(c)} className="text-left bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-[#C48229] transition-colors flex">
                  {c.imagemUrl ? (
                    <img src={c.imagemUrl} alt="" className="w-24 object-cover bg-slate-100 shrink-0" loading="lazy" />
                  ) : (
                    <span className="w-24 bg-slate-100 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    </span>
                  )}
                  <span className="p-3.5 space-y-1.5 min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#92611F]">
                      Nº {numeroFormatado(c)} · {c.categoria} ·{' '}
                      {c.publico === 'clientes' ? <Building2 className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {c.publico === 'clientes' ? 'Clientes' : 'Colaboradores'}
                    </span>
                    <span className="block text-sm font-black text-slate-900 line-clamp-2">{c.titulo}</span>
                    <span className="block text-[11px] text-slate-500">{dataHora(c.criadoEm)}</span>
                    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                      <span>{ds.length} destinatário(s)</span>
                      <span>{enviados} enviados</span>
                      <span>{vistos} abriram</span>
                      {c.exigeCiencia && <span className="font-bold text-emerald-700">{cientes} cientes</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {novo && (
        <NovoComunicadoModal
          colaboradores={colaboradores}
          clientes={clientes}
          criadoPor={currentUser?.nome}
          onClose={() => setNovo(false)}
          onCriado={(c, ds) => {
            setComunicados((prev) => [c, ...prev]);
            setDestinatarios((prev) => [...ds, ...prev]);
            setNovo(false);
            setAberto(c);
          }}
        />
      )}

      {aberto && (
        <DetalheComunicado
          comunicado={aberto}
          destinatarios={porComunicado.get(aberto.id) || []}
          onClose={() => setAberto(null)}
          onEnviados={(ids, canal) => {
            const agora = new Date().toISOString();
            setDestinatarios((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, enviadoEm: agora, canal } : d)));
          }}
          onAtualizar={async () => {
            const ds = await getDestinatarios(aberto.id);
            setDestinatarios((prev) => [...prev.filter((d) => d.comunicadoId !== aberto.id), ...ds]);
          }}
          onExcluir={async () => {
            await excluirComunicado(aberto.id);
            setComunicados((prev) => prev.filter((c) => c.id !== aberto.id));
            setDestinatarios((prev) => prev.filter((d) => d.comunicadoId !== aberto.id));
            setAberto(null);
          }}
        />
      )}
    </div>
  );
};

const DetalheComunicado: React.FC<{
  comunicado: Comunicado;
  destinatarios: DestinatarioComunicado[];
  onClose: () => void;
  onEnviados: (ids: string[], canal: 'whatsapp' | 'email') => void;
  onAtualizar: () => Promise<void>;
  onExcluir: () => Promise<void>;
}> = ({ comunicado: c, destinatarios, onClose, onEnviados, onAtualizar, onExcluir }) => {
  const [whatsapp, setWhatsapp] = useState<ItemEnvioWhatsApp[] | null>(null);
  const [filaEmail, setFilaEmail] = useState<DestinatarioComunicado[] | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [baixandoImagem, setBaixandoImagem] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const linksUnicos = useLinksUnicos(destinatarios.filter((d) => d.tipo === 'colaborador' && d.refId).map((d) => d.refId!));
  const linkPessoal = (d: DestinatarioComunicado) => (d.tipo === 'colaborador' && d.refId ? linksUnicos.linkDe(d.refId, `comunicado:${d.id}`) : null);

  const ordenados = [...destinatarios].sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '') || a.nome.localeCompare(b.nome));
  const pendentes = ordenados.filter((d) => (c.exigeCiencia ? !d.cienteEm : !d.visualizadoEm));
  const comEmail = ordenados.filter((d) => d.email?.trim());
  const assunto = `Comunicado nº ${numeroFormatado(c)} — ${c.titulo}`;

  const abrirWhatsapp = (lista: DestinatarioComunicado[]) =>
    setWhatsapp(lista.map((d) => ({ id: d.id, nome: d.empresa ? `${d.nome} (${d.empresa})` : d.nome, telefone: d.telefone, mensagem: mensagemPara(c, d, 'whatsapp', linkPessoal(d)) })));

  const handleEmailTodos = () => {
    if (c.exigeCiencia) {
      // Ciência precisa do link de cada pessoa — um e-mail por destinatário, em fila.
      setFilaEmail(comEmail.filter((d) => !d.cienteEm));
      return;
    }
    // Sem ciência: um e-mail só, com todos em cópia oculta (em lotes, por causa do limite de tamanho do link).
    const corpoGeral = `${textoParaImagem(c.corpo).replace(/\*([^*\n]+)\*/g, '$1')}\n\nAtenciosamente,\n${c.assinatura}\nJM Transportes`;
    const emails = comEmail.map((d) => d.email!.trim());
    for (let i = 0; i < emails.length; i += 40) {
      window.open(mailto(emails.slice(i, i + 40), assunto, corpoGeral, true), '_blank');
    }
    onEnviados(comEmail.map((d) => d.id), 'email');
    marcarEnviado(comEmail.map((d) => d.id), 'email').catch(console.error);
  };

  const handleBaixarImagem = async () => {
    setBaixandoImagem(true);
    try {
      if (c.imagemUrl) {
        const r = await fetch(c.imagemUrl);
        baixarBlob(await r.blob(), `Comunicado_${numeroFormatado(c).replace('/', '-')}.png`);
      } else {
        const { blob } = await gerarImagemComunicado({
          modelo: c.modeloImagem,
          estilo: c.estiloImagem,
          titulo: c.titulo,
          texto: textoParaImagem(c.corpo),
          destaque: c.destaque,
          assinatura: c.assinatura,
          numero: numeroFormatado(c),
          fotoUrl: c.fotoUrl,
        });
        baixarBlob(blob, `Comunicado_${numeroFormatado(c).replace('/', '-')}.png`);
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível baixar a imagem.');
    } finally {
      setBaixandoImagem(false);
    }
  };

  const handleBaixarPdf = () => {
    const arquivo = gerarPdfComunicado({
      numero: numeroFormatado(c),
      titulo: c.titulo,
      categoria: c.categoria,
      corpo: c.corpo,
      assinatura: c.assinatura,
      data: new Date(c.criadoEm),
      publico: c.publico === 'clientes' ? 'Clientes' : 'Colaboradores',
    });
    baixarBlob(arquivo, arquivo.name);
  };

  const handleCopiarTexto = async () => {
    const texto = `*${assunto}*\n\n${textoParaImagem(c.corpo)}\n\n${c.assinatura} — JM Transportes`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o texto:', texto);
    }
  };

  if (whatsapp) {
    return (
      <EnvioWhatsAppEmMassaModal
        titulo={`Comunicado nº ${numeroFormatado(c)} por WhatsApp`}
        itens={whatsapp}
        onClose={() => setWhatsapp(null)}
        onVoltar={() => setWhatsapp(null)}
        onAberto={(id) => {
          onEnviados([id], 'whatsapp');
          marcarEnviado([id], 'whatsapp').catch(console.error);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[94vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-[#92611F]">
              Nº {numeroFormatado(c)} · {c.categoria} · {c.publico === 'clientes' ? 'Clientes' : 'Colaboradores'} · {dataHora(c.criadoEm)}
            </p>
            <h2 className="text-base font-black text-slate-900">{c.titulo}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid md:grid-cols-[260px_1fr] gap-5">
          <div className="space-y-2">
            {c.imagemUrl ? (
              <img src={c.imagemUrl} alt="Imagem do comunicado" className="w-full rounded-xl border border-slate-200" />
            ) : (
              <div className="aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-300" />
              </div>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              <button type="button" onClick={handleBaixarImagem} disabled={baixandoImagem} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5">
                {baixandoImagem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#92611F]" />} Baixar imagem (PNG)
              </button>
              <button type="button" onClick={handleBaixarPdf} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#92611F]" /> Baixar PDF timbrado
              </button>
              <button type="button" onClick={handleCopiarTexto} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5">
                {copiado ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#92611F]" />} {copiado ? 'Copiado' : 'Copiar texto'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">A imagem e o PDF são iguais para todos; o texto do WhatsApp e do e-mail sai com o nome de cada pessoa.</p>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-line max-h-40 overflow-y-auto">{c.corpo}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => abrirWhatsapp(pendentes)}
                disabled={pendentes.length === 0}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp — {c.exigeCiencia ? 'quem não confirmou' : 'quem não abriu'} ({pendentes.length})
              </button>
              <button
                type="button"
                onClick={handleEmailTodos}
                disabled={comEmail.length === 0}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                title={c.exigeCiencia ? 'Abre um e-mail por pessoa (cada um com o link de ciência)' : 'Abre um e-mail com todos em cópia oculta'}
              >
                <Mail className="w-3.5 h-3.5" /> E-mail ({comEmail.length})
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAtualizando(true);
                  await onAtualizar().catch(console.error);
                  setAtualizando(false);
                }}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5"
              >
                {atualizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />} Atualizar status
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-2">Destinatário</th>
                    <th className="text-left p-2">Enviado</th>
                    <th className="text-left p-2">Abriu</th>
                    {c.exigeCiencia && <th className="text-left p-2">Ciência</th>}
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordenados.map((d) => (
                    <tr key={d.id}>
                      <td className="p-2">
                        <p className="font-semibold text-slate-800">{d.nome}</p>
                        {d.empresa && <p className="text-[10px] text-slate-400">{d.empresa}</p>}
                      </td>
                      <td className="p-2 text-slate-500">{d.enviadoEm ? `${dataHora(d.enviadoEm)}${d.canal === 'email' ? ' (e-mail)' : ''}` : '—'}</td>
                      <td className="p-2 text-slate-500">{d.visualizadoEm ? <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{dataHora(d.visualizadoEm)}</span> : '—'}</td>
                      {c.exigeCiencia && (
                        <td className="p-2">{d.cienteEm ? <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{dataHora(d.cienteEm)}</span> : <span className="text-slate-400">pendente</span>}</td>
                      )}
                      <td className="p-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          title="Copiar o link desta pessoa"
                          onClick={() => {
                            const link = linkPessoal(d) || montarLinkComunicado(d.token);
                            navigator.clipboard.writeText(link).catch(() => window.prompt('Copie o link:', link));
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => window.confirm('Excluir este comunicado e o histórico de envio/ciência? Os links param de funcionar.') && onExcluir().catch(console.error)}
              className="text-rose-600 font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir comunicado
            </button>
          </div>
        </div>
      </div>

      {filaEmail && (
        <FilaEmail
          comunicado={c}
          fila={filaEmail}
          assunto={assunto}
          linkPessoal={linkPessoal}
          onClose={() => setFilaEmail(null)}
          onEnviado={(id) => {
            onEnviados([id], 'email');
            marcarEnviado([id], 'email').catch(console.error);
          }}
        />
      )}
    </div>
  );
};

/** Um e-mail por pessoa (cada um com o próprio link de ciência), em fila como no WhatsApp. */
const FilaEmail: React.FC<{
  comunicado: Comunicado;
  fila: DestinatarioComunicado[];
  assunto: string;
  onClose: () => void;
  onEnviado: (id: string) => void;
  linkPessoal?: (d: DestinatarioComunicado) => string | null;
}> = ({ comunicado, fila, assunto, onClose, onEnviado, linkPessoal }) => {
  const [feitos, setFeitos] = useState<Set<string>>(new Set());
  const proximo = fila.find((d) => !feitos.has(d.id));
  const abrir = (d: DestinatarioComunicado) => {
    window.open(mailto([d.email!.trim()], assunto, mensagemPara(comunicado, d, 'email', linkPessoal?.(d))), '_blank');
    setFeitos((prev) => new Set(prev).add(d.id));
    onEnviado(d.id);
  };
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col text-xs">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#92611F]" /> E-mail com link de ciência
            </h2>
            <p className="text-slate-500 mt-0.5">
              {feitos.size} de {fila.length} abertos — cada clique abre o e-mail da próxima pessoa pronto; é só enviar.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          {proximo ? (
            <button type="button" onClick={() => abrir(proximo)} className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl font-bold">
              Abrir e-mail de {proximo.nome}
            </button>
          ) : (
            <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold">Todos abertos.</p>
          )}
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {fila.map((d) => (
              <li key={d.id} className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <strong>{d.nome}</strong> <span className="text-slate-400">{d.email}</span>
                </span>
                {feitos.has(d.id) ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <button type="button" onClick={() => abrir(d)} className="text-[#92611F] font-bold shrink-0">
                    Abrir
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
