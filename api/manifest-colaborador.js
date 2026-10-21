// Manifest do app JMT Colaborador COM o link pessoal (função da Vercel).
//
// Por que existe: no iPhone, o app instalado na Tela de Início não enxerga o que ficou
// guardado no Safari — abria sem o link da pessoa ("Este link não é válido") e não havia
// como entrar. Com o token no endereço inicial do app, ele já abre no portal certo.
// A página /colaborador/ troca o manifest para este endereço quando tem o token na URL
// (ver configurarApp em src/utils/appInstalavel.ts). O "id" é o mesmo do manifest fixo
// (public/manifest-portal.webmanifest — manter os dois iguais), então continua sendo um app só.

const MANIFEST = {
  id: '/colaborador/',
  name: 'JMT Colaborador',
  short_name: 'JMT Colaborador',
  description: 'Ponto, documentos, comunicados, treinamentos e Jornal da JMT no seu celular.',
  start_url: '/colaborador/?form=portal&app=1',
  scope: '/colaborador/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F8FAFC',
  theme_color: '#C48229',
  lang: 'pt-BR',
  icons: [
    { src: '/icons/portal-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/portal-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/portal-mascaravel-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export default function handler(req, res) {
  const token = String(req.query?.t || '');
  const manifest = { ...MANIFEST };
  // Só aceita o formato do token do portal (64 caracteres hexadecimais).
  if (/^[a-f0-9]{64}$/i.test(token)) manifest.start_url = `/colaborador/?form=portal&app=1&token=${token}`;
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(JSON.stringify(manifest));
}
