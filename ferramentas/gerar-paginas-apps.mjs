// Gera as páginas dos dois apps instaláveis a partir do index.html:
//   gestao/index.html       → app JMT Gestão      (manifest-gestao,  escopo /gestao/)
//   colaborador/index.html  → app JMT Colaborador (manifest-portal,  escopo /colaborador/)
// Rodar sempre que o index.html mudar:  node ferramentas/gerar-paginas-apps.mjs
//
// Por que existe: o celular/navegador lê o manifest (nome, ícone, endereço do app) direto do
// HTML, antes do sistema carregar — trocar depois pelo JS instalava o app errado. E os dois
// apps precisam de endereços separados: com a Gestão no site inteiro ("/"), o portal do
// colaborador abria dentro do app da Gestão e o navegador nem oferecia instalar o outro.
// O index.html da raiz continua servindo os links públicos (formulários, comunicados etc.);
// quem decide para qual página ir é levarParaPaginaCerta() em src/utils/appInstalavel.ts.
import fs from 'fs';

const base = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');
const BLOCO_MANIFEST = `    <!-- App instalável (PWA): o portal do colaborador troca para o manifest-portal no main.tsx -->
    <link id="manifest-app" rel="manifest" href="/manifest-gestao.webmanifest">
    <link id="apple-icone-app" rel="apple-touch-icon" href="/icons/gestao-apple-180.png">
    <meta id="cor-tema-app" name="theme-color" content="#16130F">`;

function gerar(pasta, { titulo, manifest, icone, cor, nomeApp }) {
  let s = base;
  const troca = (a, b) => {
    if (s.split(a).length !== 2) throw new Error('index.html mudou — não achei: ' + a.slice(0, 80));
    s = s.split(a).join(b);
  };
  if (titulo) troca(s.match(/<title>[^<]*<\/title>/)[0], `<title>${titulo}</title>`);
  troca(
    BLOCO_MANIFEST,
    `    <!-- App ${nomeApp} (PWA). GERADO por ferramentas/gerar-paginas-apps.mjs a partir do
         index.html — não editar aqui. -->
    <link id="manifest-app" rel="manifest" href="/${manifest}">
    <link id="apple-icone-app" rel="apple-touch-icon" href="/icons/${icone}">
    <meta id="cor-tema-app" name="theme-color" content="${cor}">`
  );
  troca(
    `<meta id="apple-titulo-app" name="apple-mobile-web-app-title" content="JMT Gestão">`,
    `<meta id="apple-titulo-app" name="apple-mobile-web-app-title" content="${nomeApp}">`
  );
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(`${pasta}/index.html`, s);
  console.log(`${pasta}/index.html gerado`);
}

gerar('gestao', { manifest: 'manifest-gestao.webmanifest', icone: 'gestao-apple-180.png', cor: '#16130F', nomeApp: 'JMT Gestão' });
gerar('colaborador', {
  titulo: 'JMT Colaborador',
  manifest: 'manifest-portal.webmanifest',
  icone: 'portal-apple-180.png',
  cor: '#C48229',
  nomeApp: 'JMT Colaborador',
});
