import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/Auth/AuthGate.tsx';
import { ativarMaiusculoAutomatico } from './utils/autoUppercase.ts';
import './index.css';
import { configurarApp, levarPortalParaPaginaPropria } from './utils/appInstalavel.ts';

// Por padrão, todo campo de texto do sistema salva em CAIXA ALTA (ver autoUppercase.ts).
ativarMaiusculoAutomatico();

// App instalável (ícone, tela cheia, notificações) — ver appInstalavel.ts.
// Link antigo do portal (/?form=portal...) vai para /colaborador/ antes de montar a tela.
if (!levarPortalParaPaginaPropria()) {
  configurarApp();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthGate>
        <App />
      </AuthGate>
    </StrictMode>,
  );
}
