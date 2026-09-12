import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/Auth/AuthGate.tsx';
import { ativarMaiusculoAutomatico } from './utils/autoUppercase.ts';
import './index.css';

// Por padrão, todo campo de texto do sistema salva em CAIXA ALTA (ver autoUppercase.ts).
ativarMaiusculoAutomatico();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);
