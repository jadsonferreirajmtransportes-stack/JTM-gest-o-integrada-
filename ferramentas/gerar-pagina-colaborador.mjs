// Gera colaborador/index.html (página do app JMT Colaborador) a partir do index.html.
// Rodar sempre que o index.html mudar:  node ferramentas/gerar-pagina-colaborador.mjs
//
// Por que existe: o celular lê o manifest (nome, ícone, endereço inicial do app) direto do
// HTML, antes do sistema carregar. Com uma página só, o portal instalava o app da Gestão
// (que pede login e senha). Em /colaborador/ o manifest do portal já vem no HTML.
import fs from 'fs';

let s = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');
const troca = (a, b) => {
  if (s.split(a).length !== 2) throw new Error('index.html mudou — não achei: ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
troca(s.match(/<title>[^<]*<\/title>/)[0], '<title>JMT Colaborador</title>');
troca(
  `    <!-- App instalável (PWA): o portal do colaborador troca para o manifest-portal no main.tsx -->
    <link id="manifest-app" rel="manifest" href="/manifest-gestao.webmanifest">
    <link id="apple-icone-app" rel="apple-touch-icon" href="/icons/gestao-apple-180.png">
    <meta id="cor-tema-app" name="theme-color" content="#16130F">`,
  `    <!-- App JMT Colaborador (PWA). GERADO por ferramentas/gerar-pagina-colaborador.mjs a partir
         do index.html — não editar aqui. -->
    <link id="manifest-app" rel="manifest" href="/manifest-portal.webmanifest">
    <link id="apple-icone-app" rel="apple-touch-icon" href="/icons/portal-apple-180.png">
    <meta id="cor-tema-app" name="theme-color" content="#C48229">`
);
troca(
  `<meta id="apple-titulo-app" name="apple-mobile-web-app-title" content="JMT Gestão">`,
  `<meta id="apple-titulo-app" name="apple-mobile-web-app-title" content="JMT Colaborador">`
);
fs.mkdirSync('colaborador', { recursive: true });
fs.writeFileSync('colaborador/index.html', s);
console.log('colaborador/index.html gerado');
