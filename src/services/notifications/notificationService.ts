import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';
import { Transaction } from '@/types';

/**
 * Identificadores padronizados dos canais de notificação no Android
 */
export const NOTIFICATION_CHANNELS = {
  ALERTS: 'finz_alerts',
  TRANSACTIONS: 'finz_transactions',
} as const;

// Carregamento dinâmico e seguro de expo-notifications para evitar crash em ambientes onde o módulo nativo ainda não foi compilado
let Notifications: typeof ExpoNotifications | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.warn('[NotificationService] Módulo nativo expo-notifications não carregado:', error);
  Notifications = null;
}

/**
 * Formata um valor em centavos para a moeda brasileira (BRL)
 */
export function formatCentsToBRL(cents: number): string {
  const validCents = Number.isFinite(cents) ? cents : 0;
  try {
    return (validCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  } catch {
    const val = (validCents / 100).toFixed(2).replace('.', ',');
    return `R$ ${val}`;
  }
}

/**
 * Cria os canais de alta prioridade no Android com som, vibração e exibição na tela de bloqueio
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) return;

  try {
    // Canal para Alertas Bancários ('finz_alerts')
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ALERTS, {
      name: 'Finz - Alertas Bancários',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#00D09E',
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });

    // Canal para Transações e Pagamentos ('finz_transactions')
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.TRANSACTIONS, {
      name: 'Finz - Transações',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#00D09E',
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  } catch (err) {
    console.warn('[NotificationService] Falha ao configurar canais:', err);
  }
}

/**
 * Verifica se a aplicação possui permissão para envio de notificações
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    return !!(
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    );
  } catch (error) {
    console.warn('[NotificationService] Erro ao consultar permissões:', error);
    return false;
  }
}

/**
 * Solicita as permissões nativas necessárias:
 * - No Android 13+ (API 33+): dispara o prompt de runtime POST_NOTIFICATIONS
 * - No iOS: solicita permissão de alert, badge e sound
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const currentSettings = await Notifications.getPermissionsAsync();
    let isGranted =
      currentSettings.granted ||
      currentSettings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      currentSettings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    if (!isGranted) {
      const response = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      isGranted =
        response.granted ||
        response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        response.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    }

    return isGranted;
  } catch (error) {
    console.warn('[NotificationService] Erro ao solicitar permissões nativas:', error);
    return false;
  }
}

/**
 * Inicializa os canais de alta prioridade e solicita permissões
 */
export async function initNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }
    await requestNotificationPermissions();
  } catch (error) {
    console.warn('[NotificationService] Falha na inicialização do serviço:', error);
  }
}

export interface SendLocalNotificationParams {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  badge?: number;
}

/**
 * Dispara uma notificação nativa local imediatamente
 */
export async function sendLocalNotification({
  title,
  body,
  data = {},
  channelId = NOTIFICATION_CHANNELS.ALERTS,
  badge,
}: SendLocalNotificationParams): Promise<string | undefined> {
  if (!Notifications) {
    console.log('[NotificationService] Notificação enviada (sem módulo nativo):', title, body);
    return undefined;
  }
  try {
    const hasPerm = await hasNotificationPermissions();
    if (!hasPerm) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        console.warn('[NotificationService] ⚠️ Notificação cancelada: permissão não concedida no dispositivo (iOS/Android).');
        return undefined;
      }
    }

    // Configura trigger com canal específico no Android para acionar alta prioridade
    const trigger =
      Platform.OS === 'android' && channelId ? { channelId } : null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        color: '#00D09E',
        badge: typeof badge === 'number' ? badge : 1,
      },
      trigger,
    });

    console.log(`[NotificationService] ✅ Notificação enviada com sucesso [${identifier}]: "${title}" - "${body}"`);
    return identifier;
  } catch (error) {
    console.error('[NotificationService] Falha ao disparar notificação local:', error);
    return undefined;
  }
}

/**
 * Dispara notificação de teste para verificar se o sistema nativo está 100% ativo
 */
export async function sendTestNotification(): Promise<string | undefined> {
  await requestNotificationPermissions();
  return sendLocalNotification({
    title: '🔔 Finz • Notificações Ativas',
    body: 'Teste recebido com sucesso! Seus alertas bancários em tempo real estão funcionando no seu celular.',
    channelId: NOTIFICATION_CHANNELS.ALERTS,
    data: { type: 'TEST_NOTIFICATION' },
  });
}

/**
 * Dispara notificação nativa de nova transação financeira
 * Suporta assinaturas:
 * - notifyNewTransaction(merchant: string, amountCents: number, bankName: string)
 * - notifyNewTransaction(tx: Transaction, bankName?: string)
 */
export async function notifyNewTransaction(
  tx: Transaction,
  bankName?: string
): Promise<void>;
export async function notifyNewTransaction(
  merchant: string,
  amountCents: number,
  bankName: string
): Promise<void>;
export async function notifyNewTransaction(
  param1: string | Transaction,
  param2?: number | string,
  param3?: string
): Promise<void> {
  let merchant: string;
  let amountCents: number;
  let bankName: string;
  let isCredit = false;
  let txType = '';

  if (typeof param1 === 'object' && param1 !== null) {
    // Recebeu objeto Transaction
    merchant = (param1.merchant || 'Transação').trim();
    const rawAmt = Number(param1.amount);
    amountCents = Number.isFinite(rawAmt) ? rawAmt : 0;
    bankName = (typeof param2 === 'string' ? param2.trim() : '') || 'Finz';
    isCredit = param1.type === 'REFUND' || param1.type === 'PIX_IN';
    txType = param1.type || '';
  } else {
    // Recebeu (merchant, amountCents, bankName)
    merchant = (typeof param1 === 'string' ? param1.trim() : '') || 'Transação';
    const rawAmt = typeof param2 === 'number' ? param2 : Number(param2);
    amountCents = Number.isFinite(rawAmt) ? rawAmt : 0;
    bankName = (typeof param3 === 'string' ? param3.trim() : '') || 'Finz';
    isCredit = amountCents < 0;
  }

  // Notificação de resumo em lote (quando amountCents é 0)
  if (amountCents === 0) {
    await sendLocalNotification({
      title: `Novas Transações • ${bankName}`,
      body: `${merchant}. Abra o app para conferir seus lançamentos.`,
      channelId: NOTIFICATION_CHANNELS.TRANSACTIONS,
      data: { type: 'BATCH_TRANSACTIONS', bankName, merchant },
    });
    return;
  }

  const isPix =
    /pix/i.test(merchant) ||
    txType === 'PIX_IN' ||
    txType === 'PIX_OUT';
  const formattedAmount = formatCentsToBRL(Math.abs(amountCents));

  let title: string;
  let body: string;

  if (isPix) {
    if (isCredit) {
      title = `Pix Recebido • ${bankName}`;
      body = `Você recebeu ${formattedAmount} via Pix de ${merchant}.`;
    } else {
      title = `Pix Enviado • ${bankName}`;
      body = `Transferência Pix de ${formattedAmount} enviada para ${merchant}.`;
    }
  } else {
    if (isCredit) {
      title = `Compra Estornada • ${bankName}`;
      body = `Estorno de ${formattedAmount} confirmado em ${merchant}.`;
    } else {
      title = `Compra Aprovada • ${bankName}`;
      body = `${merchant} no valor de ${formattedAmount}.`;
    }
  }

  await sendLocalNotification({
    title,
    body,
    channelId: NOTIFICATION_CHANNELS.TRANSACTIONS,
    data: {
      type: 'TRANSACTION',
      merchant,
      amountCents,
      bankName,
      isCredit,
      isPix,
    },
  });
}

/**
 * Dispara notificação de alteração de saldo bancário
 * Suporta assinaturas:
 * - notifyBalanceChange(bankName, newBalanceCents)
 * - notifyBalanceChange(bankName, oldBalanceCents, newBalanceCents)
 */
export async function notifyBalanceChange(
  bankName: string,
  newBalanceCents: number
): Promise<void>;
export async function notifyBalanceChange(
  bankName: string,
  oldBalanceCents: number,
  newBalanceCents: number
): Promise<void>;
export async function notifyBalanceChange(
  bankName: string,
  arg2: number,
  arg3?: number
): Promise<void> {
  let oldBalanceCents: number | undefined;
  let newBalanceCents: number;

  if (typeof arg3 === 'number') {
    oldBalanceCents = Number.isFinite(arg2) ? arg2 : 0;
    newBalanceCents = Number.isFinite(arg3) ? arg3 : 0;
  } else {
    newBalanceCents = Number.isFinite(arg2) ? arg2 : 0;
  }

  const formattedNew = formatCentsToBRL(newBalanceCents);
  const title = `Saldo Atualizado • ${bankName}`;

  let body: string;
  if (typeof oldBalanceCents === 'number' && oldBalanceCents !== newBalanceCents) {
    const diff = newBalanceCents - oldBalanceCents;
    const formattedDiff = formatCentsToBRL(Math.abs(diff));
    const direction = diff > 0 ? 'aumento' : 'redução';
    body = `Seu novo saldo disponível é ${formattedNew} (${direction} de ${formattedDiff}).`;
  } else {
    body = `Seu novo saldo disponível em ${bankName} é ${formattedNew}.`;
  }

  await sendLocalNotification({
    title,
    body,
    channelId: NOTIFICATION_CHANNELS.ALERTS,
    data: {
      type: 'BALANCE_CHANGE',
      bankName,
      newBalanceCents,
      oldBalanceCents,
    },
  });
}

/**
 * Objeto consolidado do serviço de notificações
 */
export const notificationService = {
  initNotifications,
  requestPermissions: requestNotificationPermissions,
  hasPermissions: hasNotificationPermissions,
  setupChannels: setupNotificationChannels,
  sendLocalNotification,
  sendTestNotification,
  notifyNewTransaction,
  notifyBalanceChange,
  formatCentsToBRL,
  CHANNELS: NOTIFICATION_CHANNELS,
};

export default notificationService;
