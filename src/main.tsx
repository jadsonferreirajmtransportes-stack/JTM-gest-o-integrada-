import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/Auth/AuthGate.tsx';
import { ativarMaiusculoAutomatico } from './utils/autoUppercase.ts';
import './index.css';
import { configurarApp, levarParaPaginaCerta } from './utils/appInstalavel.ts';

// Por padrão, todo campo de texto do sistema salva em CAIXA ALTA (ver autoUppercase.ts).
ativarMaiusculoAutomatico();

// App instalável (ícone, tela cheia, notificações) — ver appInstalavel.ts.
// Gestão em /gestao/, portal em /colaborador/, links públicos em / — ver appInstalavel.ts.
if (!levarParaPaginaCerta()) {
  configurarApp();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthGate>
        <App />
      </AuthGate>
    </StrictMode>,
  );
}
