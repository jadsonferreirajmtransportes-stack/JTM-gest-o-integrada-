import React, { useMemo, useState } from 'react';
import { X, Save, Loader2, Download, Send, CheckCircle2, Undo2, Plus, Trash2, ArrowUp, ArrowDown, FileSignature, GitBranch, AlertTriangle, Info } from 'lucide-react';
import { Colaborador, UsuarioLogin } from '../../types';
import { SETORES_DOCUMENTO, CLASSIFICACOES } from '../../data/setoresDocumento';
import { Pop, ConteudoPop, EtapaPop, SITUACAO_ESTILO, aprovarPop, excluirPop, novoIdPop, salvarPop, somarAnos, verificarPop } from '../../utils/popsApi';
import { baixarBlob } from '../../utils/downloadUtils';
import { DocumentosAssinaturaView } from '../Contracheques/DocumentosAssinaturaView';
import { dataBr, gerarPopPdf } from './popPdf';
import { EnviarPopCienciaModal } from './EnviarPopCienciaModal';

const hoje = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const campo = 'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[#C48229]/30 bg-white disabled:bg-slate-50 disabled:text-slate-600';

const Secao: React.FC<{ numero: string; titulo: string; dica?: string; opcional?: boolean; children: React.ReactNode }> = ({ numero, titulo, dica, opcional, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
    <div>
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
        {numero} {titulo} {opcional && <span className="normal-case font-semibold text-slate-400 tracking-normal">(opcional — sai do PDF se ficar vazio)</span>}
      </h3>
      {dica && <p className="text-[11px] text-slate-500 mt-0.5">{dica}</p>}
    </div>
    {children}
  </section>
);

interface PopEditorProps {
  pop: Pop;
  todos: Pop[];
  colaboradores: Colaborador[];
  currentUser?: UsuarioLogin;
  onClose: () => void;
  onSalvo: (p: Pop, outros?: Pop[]) => void;
  onExcluido: (id: string) => void;
  onAbrir: (p: Pop) => void;
}

export const PopEditor: React.FC<PopEditorProps> = ({ pop: inicial, todos, colaboradores, currentUser, onClose, onSalvo, onExcluido, onAbrir }) => {
  const [p, setP] = useState<Pop>(inicial);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [eu, setEu] = useState({ nome: currentUser?.nome || '', cargo: currentUser?.cargo || '' });
  const [observacao, setObservacao] = useState('');
  const [devolvendo, setDevolvendo] = useState(false);
  const [vigencia, setVigencia] = useState({ inicio: hoje(), proxima: somarAnos(hoje(), 2) });
  const [enviandoCiencia, setEnviandoCiencia] = useState(false);
  const [atualizarCiencia, setAtualizarCiencia] = useState(0);

  const editavel = p.status === 'Rascunho';
  const ehAdmin = currentUser?.role === 'admin';
  const c = p.conteudo;
  const historico = useMemo(() => todos.filter((x) => x.codigo && x.codigo === p.codigo), [todos, p.codigo]);
  const pendencias = verificarPop(p);
  const temRascunhoNovo = p.status === 'Vigente' && historico.some((x) => x.versao > p.versao && x.status !== 'Obsoleto');

  const setC = (mud: Partial<ConteudoPop>) => setP((x) => ({ ...x, conteudo: { ...x.conteudo, ...mud } }));
  const setLista = <K extends keyof ConteudoPop>(k: K, i: number, valor: any) =>
    setC({ [k]: (c[k] as any[]).map((v, j) => (j === i ? valor : v)) } as any);
  const remover = <K extends keyof ConteudoPop>(k: K, i: number) => setC({ [k]: (c[k] as any[]).filter((_, j) => j !== i) } as any);
  const adicionar = <K extends keyof ConteudoPop>(k: K, novo: any) => setC({ [k]: [...(c[k] as any[]), novo] } as any);
  const moverEtapa = (i: number, d: -1 | 1) => {
    const lista = [...c.etapas];
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setC({ etapas: lista });
  };

  const executar = async (chave: string, acao: () => Promise<Pop>, mensagem?: string, fechar = false) => {
    setSalvando(chave);
    try {
      const salvo = await acao();
      setP(salvo);
      onSalvo(salvo);
      if (mensagem) alert(mensagem);
      if (fechar) onClose();
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar. Se for o primeiro uso, confirme que a migração 073 foi rodada no Supabase.');
    } finally {
      setSalvando(null);
    }
  };

  const verPdf = () => {
    const { arquivo } = gerarPopPdf(p, { historico });
    baixarBlob(arquivo, arquivo.name);
  };

  const enviarRevisao = () => {
    if (pendencias.length) return alert(`Antes de enviar para revisão, preencha:\n\n• ${pendencias.join('\n• ')}`);
    executar('revisao', () => salvarPop({ ...p, status: 'Em revisão', elaboradoEm: new Date().toISOString(), devolucaoObservacao: undefined }), 'Enviado para revisão.', true);
  };

  const confirmarAssinante = () => {
    if (!eu.nome.trim() || !eu.cargo.trim()) {
      alert('Informe seu nome e cargo — eles vão no quadro de aprovação do POP.');
      return false;
    }
    return true;
  };

  const revisar = () => {
    if (!confirmarAssinante()) return;
    if (eu.nome.trim().toLowerCase() === (p.elaboradoPor || '').trim().toLowerCase() && !window.confirm('Você também elaborou este POP. O ideal (ISO 9001) é outra pessoa revisar. Continuar mesmo assim?')) return;
    executar('revisar', () => salvarPop({ ...p, status: 'Em aprovação', revisadoPor: eu.nome.trim(), revisadoCargo: eu.cargo.trim(), revisadoEm: new Date().toISOString() }), 'Revisão registrada. O POP foi para aprovação.', true);
  };

  const aprovar = () => {
    if (!confirmarAssinante()) return;
    if (!vigencia.inicio) return alert('Informe o início da vigência.');
    const anterior = historico.find((x) => x.status === 'Vigente' && x.id !== p.id);
    if (!window.confirm(`Aprovar e publicar ${p.codigo} versão ${String(p.versao).padStart(2, '0')}?${anterior ? `\n\nA versão ${String(anterior.versao).padStart(2, '0')} passa a ser OBSOLETA.` : ''}`)) return;
    executar(
      'aprovar',
      async () => {
        const salvo = await aprovarPop({ ...p, aprovadoPor: eu.nome.trim(), aprovadoCargo: eu.cargo.trim(), aprovadoEm: new Date().toISOString(), vigenciaInicio: vigencia.inicio, proximaRevisao: vigencia.proxima || undefined });
        if (anterior) onSalvo({ ...anterior, status: 'Obsoleto' });
        return salvo;
      },
      'POP aprovado e vigente. Agora você pode enviar para a ciência dos colaboradores.'
    );
  };

  const devolver = () => {
    if (!observacao.trim()) return alert('Explique o que precisa ser ajustado.');
    executar(
      'devolver',
      () =>
        salvarPop({
          ...p,
          status: 'Rascunho',
          devolucaoObservacao: observacao.trim(),
          devolvidoPor: eu.nome.trim() || currentUser?.nome,
          devolvidoEm: new Date().toISOString(),
          revisadoPor: undefined,
          revisadoCargo: undefined,
          revisadoEm: undefined,
        }),
      'Devolvido para quem elaborou.',
      true
    );
  };

  const novaRevisao = () => {
    if (temRascunhoNovo) return alert('Já existe uma nova versão deste POP em andamento. Abra-a pela lista.');
    if (!window.confirm(`Criar a versão ${String(p.versao + 1).padStart(2, '0')} de ${p.codigo}? A versão atual continua vigente até a nova ser aprovada.`)) return;
    const nova: Pop = {
      ...p,
      id: novoIdPop(),
      versao: p.versao + 1,
      status: 'Rascunho',
      motivoRevisao: '',
      elaboradoPor: currentUser?.nome || p.elaboradoPor,
      elaboradoCargo: currentUser?.cargo || p.elaboradoCargo,
      elaboradoEm: undefined,
      revisadoPor: undefined,
      revisadoCargo: undefined,
      revisadoEm: undefined,
      aprovadoPor: undefined,
      aprovadoCargo: undefined,
      aprovadoEm: undefined,
      vigenciaInicio: undefined,
      proximaRevisao: undefined,
      devolucaoObservacao: undefined,
      devolvidoPor: undefined,
      devolvidoEm: undefined,
      criadoPor: currentUser?.nome,
      conteudo: JSON.parse(JSON.stringify(p.conteudo)),
    };
    setSalvando('nova');
    salvarPop(nova)
      .then((salvo) => {
        onSalvo(salvo);
        onAbrir(salvo);
      })
      .catch((err) => {
        console.error(err);
        alert('Não foi possível criar a nova versão.');
      })
      .finally(() => setSalvando(null));
  };

  const excluir = () => {
    if (!window.confirm(p.codigo ? `Excluir o rascunho ${p.codigo} v${String(p.versao).padStart(2, '0')}?` : 'Descartar este rascunho?')) return;
    if (!p.codigo) return onClose();
    excluirPop(p.id)
      .then(() => {
        onExcluido(p.id);
        onClose();
      })
      .catch((err) => {
        console.error(err);
        alert('Não foi possível excluir.');
      });
  };

  const botao = (chave: string, rotulo: string, icone: React.ReactNode, onClick: () => void, estilo: 'primario' | 'secundario' | 'perigo' = 'secundario', disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!!salvando || disabled}
      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 ${
        estilo === 'primario'
          ? 'bg-[#C48229] hover:bg-[#92611F] text-white'
          : estilo === 'perigo'
            ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
            : 'border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white'
      }`}
    >
      {salvando === chave ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icone} {rotulo}
    </button>
  );

  const quemSouEu = (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-slate-600">Seu nome</span>
        <input value={eu.nome} onChange={(e) => setEu({ ...eu, nome: e.target.value })} className={`${campo} w-52`} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-slate-600">Seu cargo</span>
        <input value={eu.cargo} onChange={(e) => setEu({ ...eu, cargo: e.target.value })} className={`${campo} w-48`} />
      </label>
    </div>
  );

  const texto = (valor: string, onChange: (v: string) => void, linhas = 3, placeholder?: string) => (
    <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={linhas} disabled={!editavel} placeholder={placeholder} className={`${campo} resize-y leading-relaxed`} />
  );
  const lixeira = (onClick: () => void) =>
    editavel && (
      <button type="button" onClick={onClick} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md shrink-0" title="Remover">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    );
  const maisUm = (rotulo: string, onClick: () => void) =>
    editavel && (
      <button type="button" onClick={onClick} className="text-[11px] font-bold text-[#92611F] flex items-center gap-1 hover:underline">
        <Plus className="w-3.5 h-3.5" /> {rotulo}
      </button>
    );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-stretch justify-center p-2" data-texto-livre="true" data-no-uppercase="true">
      <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-5xl flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-[#92611F]">{p.codigo || 'Novo POP'}</span>
              <span className="text-[11px] text-slate-500">Versão {String(p.versao).padStart(2, '0')}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITUACAO_ESTILO[p.status]}`}>{p.status}</span>
            </div>
            <h2 className="text-sm font-black text-slate-900 truncate">{p.titulo || 'Procedimento Operacional Padrão'}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {botao('pdf', p.status === 'Vigente' ? 'Baixar PDF' : 'Ver prévia do PDF', <Download className="w-3.5 h-3.5" />, verPdf)}
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {p.devolucaoObservacao && editavel && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[#92611F]">
              <p className="font-bold flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" /> Devolvido para ajuste{p.devolvidoPor ? ` por ${p.devolvidoPor}` : ''}
                {p.devolvidoEm ? ` em ${dataBr(p.devolvidoEm.slice(0, 10))}` : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{p.devolucaoObservacao}</p>
            </div>
          )}

          {/* Painel do fluxo */}
          {p.status === 'Em revisão' && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-3">
              <p className="font-bold text-sky-800">Aguardando revisão. Leia o POP (ou baixe a prévia do PDF) e registre a revisão — ou devolva com o que precisa mudar.</p>
              {quemSouEu}
              <div className="flex flex-wrap gap-2">
                {botao('revisar', 'Revisado — enviar para aprovação', <CheckCircle2 className="w-3.5 h-3.5" />, revisar, 'primario')}
                {botao('dev', 'Devolver para ajuste', <Undo2 className="w-3.5 h-3.5" />, () => setDevolvendo((v) => !v))}
              </div>
            </div>
          )}
          {p.status === 'Em aprovação' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <p className="font-bold text-[#92611F]">
                Revisado por {p.revisadoPor} ({p.revisadoCargo}). {ehAdmin ? 'Aprove para o POP entrar em vigor — ou devolva.' : 'Aguardando a aprovação de um administrador.'}
              </p>
              {ehAdmin && (
                <>
                  {quemSouEu}
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Início da vigência</span>
                      <input type="date" value={vigencia.inicio} onChange={(e) => setVigencia({ inicio: e.target.value, proxima: e.target.value ? somarAnos(e.target.value, 2) : '' })} className={campo} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Próxima revisão (sugestão: 2 anos)</span>
                      <input type="date" value={vigencia.proxima} onChange={(e) => setVigencia({ ...vigencia, proxima: e.target.value })} className={campo} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {botao('aprovar', 'Aprovar e publicar', <CheckCircle2 className="w-3.5 h-3.5" />, aprovar, 'primario')}
                    {botao('dev', 'Devolver para ajuste', <Undo2 className="w-3.5 h-3.5" />, () => setDevolvendo((v) => !v))}
                  </div>
                </>
              )}
            </div>
          )}
          {devolvendo && (p.status === 'Em revisão' || p.status === 'Em aprovação') && (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
              <p className="font-bold text-slate-700">O que precisa ser ajustado?</p>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} className={campo} />
              {botao('devolver', 'Confirmar devolução', <Undo2 className="w-3.5 h-3.5" />, devolver, 'perigo')}
            </div>
          )}
          {p.status === 'Vigente' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <p className="font-bold text-emerald-800">
                Vigente desde {dataBr(p.vigenciaInicio)} · próxima revisão {dataBr(p.proximaRevisao)}
                {p.proximaRevisao && p.proximaRevisao < hoje() && <span className="text-rose-600"> — revisão vencida</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {botao('ciencia', 'Enviar para ciência dos colaboradores', <FileSignature className="w-3.5 h-3.5" />, () => setEnviandoCiencia(true), 'primario')}
                {botao('nova', 'Criar nova revisão', <GitBranch className="w-3.5 h-3.5" />, novaRevisao)}
              </div>
              {temRascunhoNovo && <p className="text-[11px] text-[#92611F] font-semibold">Já existe uma nova versão em andamento — veja na lista de POPs.</p>}
            </div>
          )}
          {p.status === 'Obsoleto' && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Versão obsoleta — mantida só para histórico. Use a versão vigente.
            </div>
          )}

          {/* Identificação */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-6 gap-3">
            <label className="sm:col-span-6 flex flex-col gap-1">
              <span className="font-semibold text-slate-600">Título do POP</span>
              <input value={p.titulo} onChange={(e) => setP({ ...p, titulo: e.target.value })} disabled={!editavel} placeholder="Ex.: Recebimento de medicamentos termolábeis" className={`${campo} text-sm font-semibold`} />
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="font-semibold text-slate-600">Setor</span>
              <select value={p.setor} onChange={(e) => setP({ ...p, setor: e.target.value })} disabled={!editavel || !!p.codigo} className={campo} title={p.codigo ? 'O setor faz parte do código e não muda depois de salvo' : ''}>
                {SETORES_DOCUMENTO.map((s) => (
                  <option key={s.sigla} value={s.sigla}>
                    {s.nome} ({s.sigla})
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="font-semibold text-slate-600">Classificação</span>
              <select value={p.classificacao} onChange={(e) => setP({ ...p, classificacao: e.target.value })} disabled={!editavel} className={campo}>
                {CLASSIFICACOES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <span className="font-semibold text-slate-600">Código</span>
              <span className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">{p.codigo || `POP-${p.setor}-___ (ao salvar)`}</span>
            </div>
            <label className="sm:col-span-3 flex flex-col gap-1">
              <span className="font-semibold text-slate-600">Elaborado por</span>
              <input value={p.elaboradoPor || ''} onChange={(e) => setP({ ...p, elaboradoPor: e.target.value })} disabled={!editavel} className={campo} />
            </label>
            <label className="sm:col-span-3 flex flex-col gap-1">
              <span className="font-semibold text-slate-600">Cargo de quem elaborou</span>
              <input value={p.elaboradoCargo || ''} onChange={(e) => setP({ ...p, elaboradoCargo: e.target.value })} disabled={!editavel} className={campo} />
            </label>
            {p.versao > 1 && (
              <label className="sm:col-span-6 flex flex-col gap-1">
                <span className="font-semibold text-slate-600">O que mudou nesta versão (vai para o histórico de revisões)</span>
                <input value={p.motivoRevisao || ''} onChange={(e) => setP({ ...p, motivoRevisao: e.target.value })} disabled={!editavel} placeholder="Ex.: Inclusão do prazo máximo de descarga na etapa 7.2." className={campo} />
              </label>
            )}
          </section>

          <Secao numero="1" titulo="Objetivo" dica="Para que serve este procedimento — uma ou duas frases, começando com verbo no infinitivo (Estabelecer, Definir, Padronizar...).">
            {texto(c.objetivo, (v) => setC({ objetivo: v }), 3, 'Estabelecer o procedimento para...')}
          </Secao>

          <Secao numero="2" titulo="Campo de aplicação" dica="Onde, para quem e em quais situações o POP se aplica (setores, bases, atividades).">
            {texto(c.aplicacao, (v) => setC({ aplicacao: v }), 2, 'Aplica-se a...')}
          </Secao>

          <Secao numero="3" titulo="Referências" opcional dica="Normas e legislação usadas, no formato da NBR 6023. Ex.: BRASIL. Agência Nacional de Vigilância Sanitária. Resolução RDC nº 430, de 8 de outubro de 2020. Diário Oficial da União, Brasília, DF, 2020.">
            {c.referencias.map((r, i) => (
              <div key={i} className="flex gap-2">
                {texto(r, (v) => setLista('referencias', i, v), 2)}
                {lixeira(() => remover('referencias', i))}
              </div>
            ))}
            {maisUm('Adicionar referência', () => adicionar('referencias', ''))}
          </Secao>

          <Secao numero="4" titulo="Termos, definições e siglas" opcional dica="Palavras técnicas e siglas que aparecem no POP.">
            {c.definicoes.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input value={d.termo} onChange={(e) => setLista('definicoes', i, { ...d, termo: e.target.value })} disabled={!editavel} placeholder="Termo ou sigla" className={`${campo} sm:w-48 shrink-0`} />
                <input value={d.definicao} onChange={(e) => setLista('definicoes', i, { ...d, definicao: e.target.value })} disabled={!editavel} placeholder="Definição" className={campo} />
                {lixeira(() => remover('definicoes', i))}
              </div>
            ))}
            {maisUm('Adicionar termo', () => adicionar('definicoes', { termo: '', definicao: '' }))}
          </Secao>

          <Secao numero="5" titulo="Responsabilidades" dica="Quem faz o quê — uma linha por função.">
            {c.responsabilidades.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input value={r.funcao} onChange={(e) => setLista('responsabilidades', i, { ...r, funcao: e.target.value })} disabled={!editavel} placeholder="Função (ex.: Conferente)" className={`${campo} sm:w-56 shrink-0`} />
                <input value={r.atribuicao} onChange={(e) => setLista('responsabilidades', i, { ...r, atribuicao: e.target.value })} disabled={!editavel} placeholder="Responsabilidade" className={campo} />
                {lixeira(() => remover('responsabilidades', i))}
              </div>
            ))}
            {maisUm('Adicionar função', () => adicionar('responsabilidades', { funcao: '', atribuicao: '' }))}
          </Secao>

          <Secao numero="6" titulo="Materiais, equipamentos e EPIs" opcional>
            {c.materiais.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m} onChange={(e) => setLista('materiais', i, e.target.value)} disabled={!editavel} className={campo} />
                {lixeira(() => remover('materiais', i))}
              </div>
            ))}
            {maisUm('Adicionar item', () => adicionar('materiais', ''))}
          </Secao>

          <Secao numero="7" titulo="Procedimento" dica='Passo a passo, na ordem. Cada etapa vira 7.1, 7.2... no PDF. Dentro da descrição, comece a linha com "-" para virar item a), b), c).'>
            {c.etapas.map((e: EtapaPop, i) => (
              <div key={e.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#92611F] shrink-0">7.{i + 1}</span>
                  <input value={e.titulo} onChange={(ev) => setLista('etapas', i, { ...e, titulo: ev.target.value })} disabled={!editavel} placeholder="Nome da etapa (ex.: Conferência da temperatura)" className={`${campo} font-semibold`} />
                  {editavel && (
                    <>
                      <button type="button" onClick={() => moverEtapa(i, -1)} className="p-1.5 text-slate-400 hover:text-slate-700" title="Subir">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moverEtapa(i, 1)} className="p-1.5 text-slate-400 hover:text-slate-700" title="Descer">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {lixeira(() => remover('etapas', i))}
                </div>
                {texto(e.descricao, (v) => setLista('etapas', i, { ...e, descricao: v }), 4, 'Descreva o que fazer...\n- item a)\n- item b)')}
                <input value={e.responsavel || ''} onChange={(ev) => setLista('etapas', i, { ...e, responsavel: ev.target.value })} disabled={!editavel} placeholder="Responsável pela etapa (opcional)" className={`${campo} sm:w-72`} />
              </div>
            ))}
            {maisUm('Adicionar etapa', () => adicionar('etapas', { id: novoIdPop('et'), titulo: '', descricao: '', responsavel: '' }))}
          </Secao>

          <Secao numero="8" titulo="Desvios e ações corretivas" opcional dica="O que fazer quando algo sai do previsto (ex.: excursão de temperatura, avaria, divergência).">
            {texto(c.desvios, (v) => setC({ desvios: v }), 3)}
          </Secao>

          <Secao numero="9" titulo="Registros" opcional dica="Formulários e controles preenchidos neste procedimento e por quanto tempo são guardados.">
            {c.registros.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input value={r.registro} onChange={(e) => setLista('registros', i, { ...r, registro: e.target.value })} disabled={!editavel} placeholder="Registro / formulário" className={campo} />
                <input value={r.responsavel} onChange={(e) => setLista('registros', i, { ...r, responsavel: e.target.value })} disabled={!editavel} placeholder="Responsável" className={`${campo} sm:w-44 shrink-0`} />
                <input value={r.guarda} onChange={(e) => setLista('registros', i, { ...r, guarda: e.target.value })} disabled={!editavel} placeholder="Guarda (ex.: 5 anos)" className={`${campo} sm:w-36 shrink-0`} />
                {lixeira(() => remover('registros', i))}
              </div>
            ))}
            {maisUm('Adicionar registro', () => adicionar('registros', { registro: '', responsavel: '', guarda: '' }))}
          </Secao>

          <Secao numero="10" titulo="Anexos" opcional dica="Nome dos anexos (Anexo A, B...) — ex.: formulários, fluxogramas.">
            {c.anexos.map((a, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="font-bold text-slate-500 w-16 shrink-0">Anexo {String.fromCharCode(65 + i)}</span>
                <input value={a} onChange={(e) => setLista('anexos', i, e.target.value)} disabled={!editavel} className={campo} />
                {lixeira(() => remover('anexos', i))}
              </div>
            ))}
            {maisUm('Adicionar anexo', () => adicionar('anexos', ''))}
          </Secao>

          {historico.length > 1 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Versões deste POP</h3>
              <ul className="divide-y divide-slate-100">
                {[...historico].sort((a, b) => b.versao - a.versao).map((v) => (
                  <li key={v.id} className="py-1.5 flex items-center justify-between gap-2">
                    <span>
                      <b>v{String(v.versao).padStart(2, '0')}</b> <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${SITUACAO_ESTILO[v.status]}`}>{v.status}</span>{' '}
                      <span className="text-slate-500">{v.motivoRevisao || (v.versao === 1 ? 'Emissão inicial' : '')}</span>
                    </span>
                    {v.id !== p.id && (
                      <button type="button" onClick={() => onAbrir(v)} className="text-[11px] font-bold text-[#92611F] hover:underline">
                        Abrir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(p.status === 'Vigente' || p.status === 'Obsoleto') && p.codigo && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Ciência dos colaboradores — esta versão</h3>
              <DocumentosAssinaturaView key={atualizarCiencia} categoria="pop" colaboradores={colaboradores} currentUser={currentUser} compacto referenciaFixa={p.id} />
            </div>
          )}
        </div>

        {editavel && (
          <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {botao('excluir', p.codigo ? 'Excluir rascunho' : 'Descartar', <Trash2 className="w-3.5 h-3.5" />, excluir, 'perigo')}
              {pendencias.length > 0 && (
                <span className="text-[11px] text-[#92611F] flex items-center gap-1" title={pendencias.join('\n')}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Falta preencher {pendencias.length} item(ns) para enviar
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {botao('salvar', 'Salvar rascunho', <Save className="w-3.5 h-3.5" />, () => (p.titulo.trim() ? executar('salvar', () => salvarPop(p), 'Rascunho salvo.') : alert('Dê um título ao POP antes de salvar.')))}
              {botao('revisao', 'Enviar para revisão', <Send className="w-3.5 h-3.5" />, enviarRevisao, 'primario')}
            </div>
          </div>
        )}
      </div>

      {enviandoCiencia && (
        <EnviarPopCienciaModal
          pop={p}
          historico={historico}
          colaboradores={colaboradores}
          criadoPor={currentUser?.nome}
          onClose={() => setEnviandoCiencia(false)}
          onEnviados={() => setAtualizarCiencia((n) => n + 1)}
        />
      )}
    </div>
  );
};

