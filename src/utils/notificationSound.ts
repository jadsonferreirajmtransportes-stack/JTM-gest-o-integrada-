// ============================================================================
// Som de notificação do Chat Interno — um "ding" curto de duas notas, gerado
// na hora pela Web Audio API. Sem arquivo de áudio externo pra não depender
// de asset/CORS/tamanho de bundle; qualquer navegador moderno já suporta.
// ============================================================================

let audioContext: AudioContext | null = null;

/** Toca o alerta sonoro de mensagem nova. Silencioso em caso de falha (ex.: navegador sem
 *  suporte, ou política de autoplay ainda não liberada por interação do usuário) — o alerta
 *  visual (toast) continua funcionando normalmente mesmo sem o som. */
export function playNotificationSound(): void {
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const tocarNota = (frequencia: number, inicioEm: number, duracao: number) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequencia;
      oscillator.connect(gain);
      gain.connect(audioContext!.destination);
      const agora = audioContext!.currentTime + inicioEm;
      gain.gain.setValueAtTime(0, agora);
      gain.gain.linearRampToValueAtTime(0.2, agora + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, agora + duracao);
      oscillator.start(agora);
      oscillator.stop(agora + duracao);
    };

    tocarNota(880, 0, 0.15);
    tocarNota(1175, 0.1, 0.2);
  } catch {
    // ignora — sem suporte ou bloqueado, segue só com o alerta visual
  }
}
