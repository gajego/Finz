import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  syncAllPluggyItems,
  getPluggyCredentials,
  getPluggyItemIds,
} from './pluggyService';
import { requestNotificationPermissions } from '@/services/notifications/notificationService';

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

/**
 * Executa uma rodada de sincronização com proteção contra concorrência (in-flight guard)
 */
export async function pollPluggyNow(): Promise<{ cardsTotal: number; txTotal: number } | null> {
  // Evita concorrência se já houver sincronização em andamento
  if (isSyncing) {
    return null;
  }

  // Verifica se o usuário possui credenciais configuradas
  const creds = getPluggyCredentials();
  if (!creds || !creds.clientId || !creds.clientSecret) {
    return null;
  }

  // Verifica se há bancos/itens conectados
  const items = getPluggyItemIds();
  if (!items || items.length === 0) {
    return null;
  }

  try {
    isSyncing = true;
    const result = await syncAllPluggyItems();
    return result;
  } catch (error) {
    console.warn('[PluggyMonitor] Erro durante o ciclo de polling:', error);
    return null;
  } finally {
    isSyncing = false;
  }
}

/**
 * Inicia o polling contínuo (padrão a cada 5 segundos)
 */
export function startPluggyPolling(intervalMs: number = 5000) {
  stopPluggyPolling();

  // Executa uma sincronização imediata
  pollPluggyNow().catch(() => {});

  // Agenda execuções periódicas a cada intervalMs
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
 * Hook do React para iniciar e gerenciar o ciclo de vida do polling em tempo real da Pluggy.
 * Respeita o estado do aplicativo (AppState), pausando em background e retomando ao voltar ao primeiro plano.
 */
export function usePluggyMonitor(intervalMs: number = 5000, pauseInBackground: boolean = true) {
  const appState = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  useEffect(() => {
    // Solicita permissões de notificação para alertas de novas transações
    requestNotificationPermissions().catch(() => {});

    // Inicia o monitoramento
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
          // App foi para segundo plano: encerra o timer para poupar bateria/dados
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
