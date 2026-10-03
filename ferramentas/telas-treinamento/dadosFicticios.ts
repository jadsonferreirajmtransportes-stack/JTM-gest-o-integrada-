// ============================================================================
// Dados FICTÍCIOS para as telas de treinamento. Parte dos dados de demonstração
// do código (src/data/initial*.ts) e passa tudo por um anonimizador: nomes de
// pessoas e de empresas clientes viram nomes inventados (em qualquer campo, até
// dentro de textos), e CPF, RG, PIS, telefone, e-mail, CEP, CNPJ de cliente,
// dados bancários e arquivos anexados são trocados ou removidos. As imagens
// geradas são públicas — nada real pode aparecer nelas.
// ============================================================================

const PESSOAS = [
  'Marcos Andrade', 'Paula Ribeiro', 'Renato Campos', 'Sílvia Moura', 'Tiago Nogueira', 'Vanessa Rocha', 'Wagner Pires',
  'Bianca Teles', 'César Duarte', 'Débora Prado', 'Eduardo Farias', 'Fernanda Luz', 'Gustavo Meireles', 'Helena Barros',
  'Igor Sampaio', 'Juliana Freitas', 'Leandro Paiva', 'Mariana Quintela', 'Nelson Vidal', 'Olívia Rangel', 'Pedro Siqueira',
  'Raquel Antunes', 'Sérgio Bastos', 'Tânia Correia', 'Ulisses Brandão', 'Valéria Cunha', 'Wesley Torres', 'Yara Moraes Lins',
];
const EMPRESAS = [
  'Distribuidora Farma Norte', 'Hospital Exemplo', 'Rede Drogaria Alfa', 'Laboratório Beta', 'Clínica Vida Exemplo',
  'Indústria Farmacêutica Gama', 'Logística Delta', 'Drogarias Ômega', 'Farmácia Central Exemplo', 'Biotec Sigma',
];
const CHAVES_PESSOA = /^(nome|nomeCompleto|nomePai|nomeMae|responsavel|responsavelNome|responsavelJMT|responsavelExpedicao|liderProjetoNome|gerenteContaResponsavel|recebedorNome|nomeRecebedor|autor|validadoPor|motoristaNome|motorista|solicitanteNome|aprovadoPor|criadoPor|supervisorNome|registradoPor|lider|gestor|testemunha\w*)$/i;
// Qualquer campo de empresa/cliente/fornecedor (ex.: razaoSocial, nomeCliente, clienteNome,
// empresaNome, remetente, fornecedorSugerido).
const CHAVES_EMPRESA = /(razao|fantasia|cliente|empresa|empregador|fornecedor|remetente|destinat|transportadora|parceiro)/i;
const PAPEIS = /\b(supervisor|supervisora|motorista|coletador|gestor|gestora|analista|respons[aá]vel|coordenador|equipe|setor|diretoria|departamento|farma|opera[cç][aã]o|qualidade|comercial|financeiro|rh|dp|jmt|todos|cliente|base|expedi[cç][aã]o|recebimento)\b/i;
// Nome de pessoa: 2+ palavras só de letras, começando com maiúscula — inclusive TUDO EM
// MAIÚSCULAS (o sistema grava os cadastros assim).
const pareceNome = (s: string) => {
  const t = s.trim();
  return /^\p{Lu}[\p{L}'.]+( (da|de|do|dos|das|e|DA|DE|DO|DOS|DAS|E|\p{Lu}[\p{L}'.]+))+$/u.test(t) && t.length <= 60 && !PAPEIS.test(t);
};

function percorrer(valor: any, visita: (chave: string, v: any, dono: any) => void, chave = '', dono: any = null) {
  if (Array.isArray(valor)) valor.forEach((v, i) => percorrer(v, visita, chave, valor));
  else if (valor && typeof valor === 'object') Object.entries(valor).forEach(([k, v]) => percorrer(v, visita, k, valor));
  else visita(chave, valor, dono);
}

/** Anonimiza várias coleções de uma vez (o mesmo nome real vira o mesmo nome fictício em
 *  todas — ex.: colaborador e o "responsável" de um projeto). */
export function anonimizar<T extends Record<string, any>>(colecoes: T): T {
  const copia = JSON.parse(JSON.stringify(colecoes));
  const pessoas = new Map<string, string>();
  const empresas = new Map<string, string>();
  percorrer(copia, (k, v) => {
    if (typeof v !== 'string' || !v.trim()) return;
    // "Débora Lima (CRF/RN)": o nome é o que vem antes do parêntese.
    const base = v.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (CHAVES_EMPRESA.test(k) && !/^(www\.|https?:|CT-)/i.test(v) && !empresas.has(v.trim())) empresas.set(v.trim(), EMPRESAS[empresas.size % EMPRESAS.length] + (empresas.size >= EMPRESAS.length ? ` ${Math.floor(empresas.size / EMPRESAS.length) + 1}` : ''));
    else if ((CHAVES_PESSOA.test(k) || /nome|membro|participante|equipe|responsav|lider|gestor|testemunha/i.test(k)) && pareceNome(base) && !pessoas.has(base)) pessoas.set(base, PESSOAS[pessoas.size % PESSOAS.length]);
  });
  // Palavra própria do nome da empresa citada sozinha em textos (ex.: "contrato com a Acme").
  const GENERICAS = /^(farma|hospital|hospitalar|laborat[oó]rio|distribuidora|distribui[cç][aã]o|ltda|eireli|drogaria|drogarias|rede|cl[ií]nica|ind[uú]stria|farmac[eê]utica|farmac[eê]uticos|medicamentos|transportes|log[ií]stica|sa[uú]de|comercio|com[eé]rcio|servi[cç]os|nordeste|brasil|grupo|atendimento|norte|sul|central)$/i;
  // Palavras do dia a dia que aparecem em cargos/setores e não podem ser trocadas.
  const COMUNS = /^(diretor[a]?|geral|administrador[a]?|gerente|supervisor[a]?|coordenador[a]?|farmac[eê]utic[oa]s?|respons[aá]vel|t[eé]cnic[oa]|motorista|ajudante|auxiliar|assistente|analista|conferente|transporte|transportes|carga|cargas|refrigerad[oa]s?|termol[aá]beis|medicamentos?|armazenagem|qualidade|garantia|opera[cç][aã]o|operacional|pessoal|departamento|log[ií]stica|rastreamento)$/i;
  const palavrasEmpresa = new Map<string, string>();
  empresas.forEach((falso, real) =>
    real
      .split(/[\s\-–.,/]+/)
      .filter((p) => p.length >= 4 && !GENERICAS.test(p) && !COMUNS.test(p) && !/^\d/.test(p))
      .forEach((p) => palavrasEmpresa.set(p.toLowerCase(), falso.replace(/ \d+$/, '').split(' ').slice(-1)[0]))
  );
  pessoas.set('Jadson Ferreira', 'Marcos Andrade');
  // Primeiro nome sozinho (ex.: "falar com Carlos") também vira o fictício.
  const primeiros = new Map<string, string>();
  pessoas.forEach((falso, real) => {
    const p = real.split(' ')[0];
    if (p.length >= 4 && !COMUNS.test(p) && !GENERICAS.test(p) && !primeiros.has(p.toLowerCase())) primeiros.set(p.toLowerCase(), falso.split(' ')[0]);
  });
  // Sobrenome sozinho (em login, nome de arquivo, e-mail...) também — depois dos primeiros
  // nomes, pra um primeiro nome nunca virar sobrenome.
  const sobrenomes = new Map<string, string>();
  pessoas.forEach((falso, real) => {
    real.split(' ').slice(1).filter((s) => s.length >= 4 && !/^(da|de|do|dos|das)$/i.test(s)).forEach((s) => {
      const k = s.toLowerCase();
      if (!COMUNS.test(s) && !GENERICAS.test(s) && !primeiros.has(k) && !sobrenomes.has(k)) sobrenomes.set(k, falso.split(' ').slice(-1)[0]);
    });
  });
  const trocas = [...pessoas.entries(), ...empresas.entries()].sort((a, b) => b[0].length - a[0].length);
  const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const limpar = (s: string): string => {
    if (s.startsWith('data:') || s.startsWith('storage:')) return '';
    let r = s
      .replace(/[\p{L}\d._+-]+@[\w-]+\.[\w.]+/gu, 'contato@exemplo.com')
      .replace(/(CRF|CRM|COREN|CRQ)\s*\/\s*([A-Z]{2})\s*[\d.\-]+/g, '$1/$2 00.000');
    // Cada troca vira um marcador temporário, pra um nome fictício já colocado não ser
    // trocado de novo pela próxima regra (ex.: o primeiro nome fictício igual a um real).
    const postos: string[] = [];
    const marcar = (falso: string) => `${postos.push(falso) - 1}`;
    for (const [real, falso] of trocas) r = r.replace(new RegExp(escapar(real), 'gi'), () => marcar(falso));
    for (const mapa of [primeiros, sobrenomes, palavrasEmpresa])
      for (const [real, falso] of mapa) r = r.replace(new RegExp(`(?<![\\p{L}])${escapar(real)}(?![\\p{L}])`, 'giu'), () => marcar(falso));
    r = r.replace(/(\d+)/g, (_, i) => postos[Number(i)]);
    return r
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '000.000.000-00') // CPF
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '00.000.000/0001-00') // CNPJ
      .replace(/\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '(84) 90000-0000') // telefone
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, 'contato@exemplo.com')
      .replace(/\b\d{5}-?\d{3}\b/g, '59000-000'); // CEP
  };
  const SENSIVEIS = /^(cpf|rg|pis|pisPasep|cnh|numeroCnh|ctps|tituloEleitor|reservista|banco|agencia|conta|contaCorrente|chavePix|pix|enderecoCompleto|endereco|cep|fotoUrl|asoArquivo|asoUrl|anexoUrl|anexos|documentos|senha|website|site|numeroContrato|numeroLicencaSanitaria|inscricaoEstadual|nomeArquivo|arquivoNome)$/i;
  percorrer(copia, (k, v, dono) => {
    if (!dono || typeof v !== 'string') return;
    const indice = Array.isArray(dono) ? dono.indexOf(v) : k;
    if (!Array.isArray(dono) && SENSIVEIS.test(k)) {
      dono[k] = /endereco/i.test(k) ? 'Rua Exemplo, 100 — Parnamirim/RN' : /cep/i.test(k) ? '59000-000' : /cpf/i.test(k) ? '000.000.000-00' : /site/i.test(k) ? 'www.exemplo.com.br' : /contrato/i.test(k) ? 'CT-JMT-0001/2026' : /arquivo/i.test(k) ? 'documento.pdf' : '';
      return;
    }
    const novo = limpar(v);
    if (novo !== v) dono[indice as any] = novo;
  });
  return copia;
}
