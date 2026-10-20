import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  syncAllPluggyItems,
  getPluggyCredentialsWithSource,
  getPluggyItemIds,
} from './pluggyService';
import {
  requestNotificationPermissions,
  hasNotificationPermissions,
} from '@/services/notifications/notificationService';

export interface PluggyDiagnosticState {
  lastCheckTime: number | null;
  status: 'idle' | 'checking' | 'success' | 'error';
  message: string;
  itemsCount: number;
  txCount: number;
  credentialsSource: 'env' | 'sqlite' | 'none';
  hasNotificationPermission: boolean;
  rawError?: string;
}

// Estado singleton observável para diagnóstico ao vivo na UI e logs locais
let diagnosticState: PluggyDiagnosticState = {
  lastCheckTime: null,
  status: 'idle',
  message: 'Aguardando inicialização...',
  itemsCount: 0,
  txCount: 0,
  credentialsSource: 'none',
  hasNotificationPermission: false,
};

const listeners = new Set<(state: PluggyDiagnosticState) => void>();

function updateDiagnostic(partial: Partial<PluggyDiagnosticState>) {
  diagnosticState = { ...diagnosticState, ...partial };
  listeners.forEach((listener) => {
    try {
      listener(diagnosticState);
    } catch {
      // Ignora falhas pontuais de listeners
    }
  });
}

/**
 * Retorna o estado atual de diagnóstico do monitor Pluggy
 */
export function getPluggyDiagnosticState(): PluggyDiagnosticState {
  return diagnosticState;
}

/**
 * Hook para componentes da UI observarem o status em tempo real do teste de 10s da Pluggy
 */
export function usePluggyDiagnostic(): PluggyDiagnosticState {
  const [state, setState] = useState<PluggyDiagnosticState>(diagnosticState);

  useEffect(() => {
    const handler = (newState: PluggyDiagnosticState) => setState(newState);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return state;
}

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

/**
 * Executa uma rodada de teste e sincronização com diagnóstico completo e logs locais a cada 10s
 */
export async function pollPluggyNow(): Promise<{ cardsTotal: number; txTotal: number } | null> {
  // Evita concorrência se já houver sincronização em andamento
  if (isSyncing) {
    return null;
  }

  const { creds, source } = getPluggyCredentialsWithSource();
  const hasNotif = await hasNotificationPermissions();

  console.log('────────────────────────────────────────────────────────');
  console.log('[Pluggy 10s Test] 📡 Executando checagem periódica (10 segundos)...');
  console.log(`[Pluggy 10s Test] 🔑 Credenciais: [Origem: ${source.toUpperCase()}]`);

  if (!creds || !creds.clientId || !creds.clientSecret) {
    const errorMsg = 'Nenhuma credencial configurada em process.env nem no SQLite.';
    console.warn(`[Pluggy 10s Test] ⚠️ ${errorMsg}`);
    console.warn('[Pluggy 10s Test] 💡 Dica: adicione EXPO_PUBLIC_PLUGGY_CLIENT_ID e EXPO_PUBLIC_PLUGGY_CLIENT_SECRET no .env ou abra o modal Open Finance.');
    updateDiagnostic({
      lastCheckTime: Date.now(),
      status: 'error',
      message: 'Credenciais ausentes (.env ou app)',
      credentialsSource: 'none',
      hasNotificationPermission: hasNotif,
      rawError: errorMsg,
    });
    return null;
  }

  const maskedId = creds.clientId.length > 8 ? `${creds.clientId.slice(0, 8)}...` : creds.clientId;
  console.log(`[Pluggy 10s Test] Client ID detectado: ${maskedId}`);
  console.log(`[Pluggy 10s Test] 🔔 Permissões de Notificação (iOS/Android): ${hasNotif ? 'AUTORIZADO ✅' : 'PENDENTE / NEGADO ⚠️'}`);

  updateDiagnostic({
    status: 'checking',
    credentialsSource: source,
    hasNotificationPermission: hasNotif,
    message: 'Consultando API Pluggy...',
  });

  try {
    isSyncing = true;
    const result = await syncAllPluggyItems();
    const items = getPluggyItemIds();

    console.log(
      `[Pluggy 10s Test] ✅ Sucesso! ${items.length} banco(s) conectado(s), ${result.cardsTotal} cartão(ões), ${result.txTotal} novas transações.`
    );
    console.log('────────────────────────────────────────────────────────');

    updateDiagnostic({
      lastCheckTime: Date.now(),
      status: 'success',
      itemsCount: items.length,
      txCount: result.txTotal,
      message: `${items.length} banco(s) • ${result.cardsTotal} cartão(ões) sincronizados`,
      rawError: undefined,
    });

    return result;
  } catch (error: any) {
    const rawError = error?.message || 'Falha de conexão com a API Pluggy';
    console.error('[Pluggy 10s Test] ❌ Erro durante o ciclo de 10s:', rawError);
    console.log('────────────────────────────────────────────────────────');

    updateDiagnostic({
      lastCheckTime: Date.now(),
      status: 'error',
      message: rawError.length > 60 ? `${rawError.slice(0, 57)}...` : rawError,
      rawError: rawError,
    });
    return null;
  } finally {
    isSyncing = false;
  }
}

/**
 * Inicia o polling contínuo a cada 10 segundos para testes e sincronização em tempo real
 */
export function startPluggyPolling(intervalMs: number = 10000) {
  stopPluggyPolling();

  // Executa uma sincronização imediata
  pollPluggyNow().catch(() => {});

  // Agenda execuções periódicas a cada 10 segundos
  pollingTimer = setInterval(() => {
    pollPluggyNow().catch(() => {});
  }, intervalMs);
}

/**
 * Encerra o polling ativo
 */
export function stopPluggyPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

/**
 * Verifica se o polling está atualmente ativo
 */
export function isPluggyPollingActive(): boolean {
  return pollingTimer !== null;
}

/**
 * Hook do React para iniciar e gerenciar o ciclo de vida do polling a cada 10s.
 * Respeita o estado do aplicativo (AppState), pausando em background e retomando ao voltar ao primeiro plano.
 */
export function usePluggyMonitor(intervalMs: number = 10000, pauseInBackground: boolean = true) {
  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  useEffect(() => {
    // Solicita permissões de notificação para alertas de novas transações
    requestNotificationPermissions().catch(() => {});

    // Inicia o monitoramento periódico a cada 10 segundos
    startPluggyPolling(intervalMs);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (pauseInBackground) {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // App retornou ao primeiro plano: retoma o polling com sync imediato
          startPluggyPolling(intervalMs);
        } else if (nextAppState.match(/inactive|background/)) {
          // App foi para segundo plano: encerra o timer para poupar bateria
          stopPluggyPolling();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      stopPluggyPolling();
    };
  }, [intervalMs, pauseInBackground]);

  return {
    syncNow: pollPluggyNow,
    stopPolling: stopPluggyPolling,
    startPolling: () => startPluggyPolling(intervalMs),
  };
}
