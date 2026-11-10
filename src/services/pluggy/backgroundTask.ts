/**
 * Background fetch task para sincronização Pluggy com app fechado.
 *
 * IMPORTANTE: TaskManager.defineTask DEVE ficar no escopo global (fora de qualquer
 * componente ou função), para que o OS consiga registrar a task quando acorda o app
 * em modo headless (sem UI). Este arquivo é importado no topo de App.tsx.
 */
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

export const PLUGGY_BG_TASK = 'finz-pluggy-background-sync';

// Define a task no escopo global — obrigatório para funcionamento headless
TaskManager.defineTask(PLUGGY_BG_TASK, async () => {
  try {
    // Importação dinâmica para evitar dependência circular no escopo global
    const { syncAllPluggyItems } = await import('./pluggyService');
    const result = await syncAllPluggyItems();
    console.log(`[BG Task] Sync concluído: ${result.txTotal} novas transações`);
    return result.txTotal > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.warn('[BG Task] Falha na sincronização em background:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registra o background fetch periódico (mínimo ~15 min no iOS, configurável no Android).
 * Chame após obter permissão de notificação e confirmar que há itens Pluggy conectados.
 */
export async function registerPluggyBackgroundFetch(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.warn('[BG Task] Background fetch não disponível neste dispositivo/OS.');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(PLUGGY_BG_TASK);
    if (isRegistered) return; // idempotente

    await BackgroundFetch.registerTaskAsync(PLUGGY_BG_TASK, {
      minimumInterval: 60 * 15, // 15 minutos
      stopOnTerminate: false,   // Android: continua após o usuário fechar o app
      startOnBoot: true,        // Android: reinicia após reboot
    });
    console.log('[BG Task] Background fetch registrado com sucesso.');
  } catch (err) {
    console.warn('[BG Task] Falha ao registrar background fetch:', err);
  }
}

/**
 * Cancela o background fetch (ex: quando o usuário desconecta todos os bancos).
 */
export async function unregisterPluggyBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(PLUGGY_BG_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(PLUGGY_BG_TASK);
      console.log('[BG Task] Background fetch cancelado.');
    }
  } catch (err) {
    console.warn('[BG Task] Falha ao cancelar background fetch:', err);
  }
}
