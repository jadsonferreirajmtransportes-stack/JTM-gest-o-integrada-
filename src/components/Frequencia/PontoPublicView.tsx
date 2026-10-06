import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Fingerprint, MapPin, CheckCircle2, Clock, RefreshCw, CalendarDays } from 'lucide-react';
import { MeuHistoricoPonto } from './MeuHistoricoPonto';
import { JmtLogo } from '../Brand/JmtLogo';
import { EstadoPonto, pontoEstado, pontoRegistrar, pontoVincular } from '../../utils/frequenciaApi';
import { horaLocal } from './frequenciaCalc';
import { credenciaisDoAparelho, gravarAparelho, lerAparelho } from '../../utils/aparelhoColaborador';
import type { CredenciaisPortal } from '../../utils/educacaoApi';

function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}
function mascararData(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}
function dataParaIso(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const data = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`);
  return Number.isNaN(data.getTime()) || data.getDate() !== Number(m[1]) ? null : `${m[3]}-${m[2]}-${m[1]}`;
}

const ROTULOS_BATIDA = ['Entrada', 'Saída para intervalo', 'Volta do intervalo', 'Saída'];

/** Pega a localização do aparelho (até 12 s). Sem permissão/sinal = bate sem GPS. */
function obterPosicao(): Promise<{ latitude: number; longitude: number; precisao: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

/** Ponto pelo celular (?form=ponto&token=...) — CONTROLE INTERNO. Primeira vez: CPF +
 *  nascimento vinculam o aparelho; depois é só tocar em "Bater ponto". O horário gravado é
 *  sempre o do servidor. */
export const PontoPublicView: React.FC<{
  token?: string;
  /** Dentro do portal do colaborador (link único): sem cabeçalho próprio. */
  embutido?: boolean;
  /** Quem já entrou no portal com CPF + nascimento ativa o ponto sem digitar de novo. */
  credenciais?: CredenciaisPortal;
  /** Avisa o portal quando o celular foi vinculado (passa a lembrar a entrada). */
  onVinculado?: (segredo: string) => void;
  /** No portal: abre a aba "Meu histórico" em vez de mostrar aqui. */
  onVerHistorico?: () => void;
}> = ({ token, embutido, credenciais, onVinculado, onVerHistorico }) => {
  const [aparelho, setAparelho] = useState<string | null>(() => (token ? lerAparelho(token) : null));
  const [estado, setEstado] = useState<EstadoPonto | null>(null);
  const [carregando, setCarregando] = useState(!!aparelho);
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [batendo, setBatendo] = useState(false);
  const [erro, setErro] = useState<string | null>(token ? null : 'Este link não é válido. Peça o link do ponto ao Departamento Pessoal.');
  const [comprovante, setComprovante] = useState<{ em: string; local?: string | null; distancia?: number | null; semGps: boolean } | null>(null);
  const [relogio, setRelogio] = useState(() => new Date());
  const [verHistorico, setVerHistorico] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRelogio(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const carregar = useCallback(async () => {
    if (!token || !aparelho) return;
    setCarregando(true);
    try {
      const r = await pontoEstado(token, aparelho);
      if (r.erro) {
        // Aparelho desconectado pelo DP ou link trocado — pede CPF de novo.
        gravarAparelho(token, null);
        setAparelho(null);
        setErro('Este aparelho foi desconectado. Confirme seus dados para entrar de novo.');
      } else if (r.estado) {
        setEstado(r.estado);
        setErro(null);
      }
    } catch (err) {
      console.error(err);
      setErro('Sem conexão com o sistema. Verifique sua internet.');
    } finally {
      setCarregando(false);
    }
  }, [token, aparelho]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleVincular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const iso = dataParaIso(nascimento);
    if (!iso) {
      setErro('Informe a data de nascimento no formato dd/mm/aaaa.');
      return;
    }
    setVinculando(true);
    setErro(null);
    try {
      const r = await pontoVincular(token, cpf, iso);
      if (r.erro === 'link') setErro('Este link não é válido ou foi substituído. Peça o link atualizado ao Departamento Pessoal.');
      else if (r.erro === 'dados') setErro('CPF ou data de nascimento não conferem com o cadastro. Cada link é pessoal — confira se este link foi enviado para você.');
      else if (r.dispositivo) {
        gravarAparelho(token, r.dispositivo);
        setCpf('');
        setNascimento('');
        setAparelho(r.dispositivo);
        onVinculado?.(r.dispositivo);
      }
    } catch (err) {
      console.error(err);
      setErro('Não foi possível entrar agora. Verifique sua internet.');
    } finally {
      setVinculando(false);
    }
  };

  const handleAtivarComPortal = async () => {
    if (!token || !credenciais) return;
    setVinculando(true);
    setErro(null);
    try {
      const r = await pontoVincular(token, credenciais.cpf, credenciais.nascimento);
      if (r.dispositivo) {
        gravarAparelho(token, r.dispositivo);
        setAparelho(r.dispositivo);
        onVinculado?.(r.dispositivo);
      } else setErro('Não foi possível ativar o ponto neste celular. Saia do portal e entre de novo.');
    } catch (err) {
      console.error(err);
      setErro('Não foi possível ativar agora. Verifique sua internet.');
    } finally {
      setVinculando(false);
    }
  };

  const handleBater = async () => {
    if (!token || !aparelho) return;
    setBatendo(true);
    setErro(null);
    setComprovante(null);
    try {
      const posicao = await obterPosicao();
      const r = await pontoRegistrar(token, aparelho, posicao);
      if (r.erro === 'repetida') setErro('Você acabou de bater o ponto. Aguarde 2 minutos para bater de novo.');
      else if (r.erro === 'dispositivo') await carregar();
      else if (r.em) {
        setComprovante({ em: r.em, local: r.local, distancia: r.distancia, semGps: !posicao });
        await carregar();
      }
    } catch (err) {
      console.error(err);
      setErro('A batida NÃO foi registrada — sem conexão. Tente de novo.');
    } finally {
      setBatendo(false);
    }
  };

  const batidas = estado?.batidas ?? [];
  // Batidas de hoje ou da jornada em curso (últimas 16h) — só pra orientar quem está batendo.
  const recentes = batidas.filter((b) => Date.now() - Date.parse(b.em) < 16 * 3600 * 1000);
  const proxima = ROTULOS_BATIDA[recentes.length] || 'Batida extra';

  return (
    <div className={embutido ? 'text-slate-800' : 'min-h-screen bg-[#F8FAFC] text-slate-800 font-sans'}>
      {!embutido && (
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <JmtLogo variant="compact" theme="light" iconSize={28} />
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#C48229]" /> Ponto JMT
          </span>
        </header>
      )}

      <main className={embutido ? 'max-w-md mx-auto space-y-4' : 'max-w-md mx-auto p-4 space-y-4'}>
        {!aparelho && credenciais ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs text-center">
            <Fingerprint className="w-10 h-10 text-[#C48229] mx-auto" />
            <div>
              <h1 className="text-base font-bold text-slate-900">Ativar o ponto neste celular</h1>
              <p className="text-xs text-slate-500 mt-1">
                O ponto fica ligado a este aparelho. Depois de ativar, seu link também abre direto, sem pedir CPF. Use só no seu celular.
              </p>
            </div>
            {erro && <p className="text-xs text-rose-700 font-semibold">{erro}</p>}
            <button
              type="button"
              onClick={handleAtivarComPortal}
              disabled={vinculando}
              className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {vinculando && <Loader2 className="w-4 h-4 animate-spin" />}
              Ativar neste celular
            </button>
          </div>
        ) : !aparelho ? (
          <form onSubmit={handleVincular} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#C48229] flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Registro de ponto</h1>
                <p className="text-xs text-slate-500">Primeiro acesso neste celular: confirme seus dados. Depois é só tocar no botão.</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">CPF</label>
              <input value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className="w-full p-3 border border-slate-300 rounded-xl text-base" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Data de nascimento</label>
              <input value={nascimento} onChange={(e) => setNascimento(mascararData(e.target.value))} inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" className="w-full p-3 border border-slate-300 rounded-xl text-base" />
            </div>
            {erro && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={!token || cpf.replace(/\D/g, '').length !== 11 || nascimento.length !== 10 || vinculando}
              className="w-full py-3 bg-[#C48229] hover:bg-[#92611F] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {vinculando && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>
        ) : carregando && !estado ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#C48229]" /> Carregando...
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center space-y-1 shadow-xs">
              <p className="text-xs text-slate-500">{estado?.colaborador.nome}</p>
              <p className="text-4xl font-black text-slate-900 tabular-nums">
                {relogio.toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {relogio.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
              {estado?.jornada && (
                <p className="text-[11px] text-[#92611F] font-semibold pt-1">
                  {estado.jornada.nome}: {String(estado.jornada.entrada).slice(0, 5)}–{String(estado.jornada.saida).slice(0, 5)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleBater}
              disabled={batendo}
              className="w-full py-8 bg-[#C48229] hover:bg-[#92611F] active:scale-[0.99] text-white rounded-3xl shadow-lg flex flex-col items-center justify-center gap-2 disabled:opacity-60"
            >
              {batendo ? <Loader2 className="w-9 h-9 animate-spin" /> : <Fingerprint className="w-10 h-10" />}
              <span className="text-lg font-black">{batendo ? 'Registrando...' : 'Bater ponto'}</span>
              {!batendo && <span className="text-xs text-white/80">{proxima}</span>}
            </button>

            {comprovante && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-800">Ponto registrado às {horaLocal(comprovante.em)}</p>
                <p className="text-[11px] text-emerald-700 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {comprovante.semGps
                    ? 'Sem localização — ative o GPS do celular nas próximas batidas.'
                    : comprovante.local
                      ? `${comprovante.local}${comprovante.distancia !== null && comprovante.distancia !== undefined ? ` (${Math.round(comprovante.distancia)} m)` : ''}`
                      : 'Localização registrada'}
                </p>
              </div>
            )}

            {erro && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Últimas batidas
                </h2>
                <button type="button" onClick={carregar} className="p-1 text-slate-400 hover:text-slate-700" title="Atualizar">
                  <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {batidas.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Nenhuma batida nas últimas 30 horas.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {[...batidas].reverse().map((b) => (
                    <li key={b.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 tabular-nums">
                        {new Date(b.em).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit' })} às {horaLocal(b.em)}
                      </span>
                      <span className="text-slate-400">{b.origem === 'ajuste' ? 'Ajuste do DP' : b.local || ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {token && aparelho && (verHistorico ? (
              <MeuHistoricoPonto credenciais={credenciaisDoAparelho(token, aparelho)} />
            ) : (
              <button
                type="button"
                onClick={() => (onVerHistorico ? onVerHistorico() : setVerHistorico(true))}
                className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-[#92611F] flex items-center justify-center gap-2 hover:bg-amber-50/50 shadow-xs"
              >
                <CalendarDays className="w-4 h-4" /> Ver meu histórico e horas do mês
              </button>
            ))}
            <p className="text-[10px] text-slate-400 text-center px-4">
              O horário registrado é o do sistema, não o do celular. A localização serve só para conferência da batida.
            </p>
          </>
        )}
      </main>
    </div>
  );
};
