import { useCallback, useEffect, useState } from 'react';
import { SolicitacaoDp, assinarDemandasDp, getSolicitacoesDp } from './solicitacoesApi';

/** Demandas do "Fale com o DP" para o Chat da gestão (079): carrega a lista e acompanha em
 *  tempo real. `ativo` = o login tem acesso ao Fale com o DP (senão não carrega nada).
 *  `sinal` muda a cada mensagem nova de uma demanda — a conversa aberta recarrega. */
export function useDemandasDp(ativo: boolean) {
  const [demandas, setDemandas] = useState<SolicitacaoDp[] | undefined>(undefined);
  const [sinal, setSinal] = useState<{ id: string; n: number }>({ id: '', n: 0 });

  const recarregar = useCallback(() => {
    if (!ativo) return;
    getSolicitacoesDp()
      .then(setDemandas)
      .catch((err) => console.error('Erro ao carregar o Fale com o DP:', err));
  }, [ativo]);

  useEffect(() => {
    if (!ativo) {
      setDemandas(undefined);
      return;
    }
    recarregar();
    return assinarDemandasDp((m) => {
      if (m.tabela === 'solicitacao_mensagens' && m.solicitacaoId) setSinal((p) => ({ id: m.solicitacaoId!, n: p.n + 1 }));
      recarregar();
    });
  }, [ativo, recarregar]);

  const naoLidas = (demandas ?? []).filter((d) => !d.lidaPeloDp && d.status !== 'concluida' && d.status !== 'recusada').length;
  return { demandas, sinal, naoLidas, recarregar };
}
