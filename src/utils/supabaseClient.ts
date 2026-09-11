import { createClient } from '@supabase/supabase-js';

// Cliente do Supabase — usado para migrar módulos do sistema do localStorage (um Chrome só)
// para um banco compartilhado (acessível de qualquer máquina). Migração feita módulo por
// módulo: por enquanto só Departamento Pessoal fala com o Supabase (ver dpApi.ts); os demais
// módulos continuam em localStorage (utils/storage.ts) até serem migrados nas próximas etapas.
//
// As variáveis vêm do .env.local (desenvolvimento, aponta pro projeto "jmt-gestao-dev") ou das
// variáveis de ambiente configuradas na Vercel/Netlify (produção, projeto "jmt-gestao-producao").
// Nunca comitar essas chaves com valor real — .env.local está no .gitignore.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase não configurado: faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Veja .env.example — copie para .env.local com as credenciais do projeto "jmt-gestao-dev".'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/** true quando as credenciais do Supabase estão presentes — usado para decidir se o
 *  Departamento Pessoal deve ler/gravar no Supabase ou cair no localStorage como reserva
 *  (ex.: ambiente sem as variáveis configuradas ainda). */
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);
