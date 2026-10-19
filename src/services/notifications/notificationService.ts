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
  try {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  } catch {
    const val = (cents / 100).toFixed(2).replace('.', ',');
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
    console.log('[NotificationService] Notificação enviada:', title, body);
    return undefined;
  }
  try {
    // Configura trigger com canal específico no Android para acionar alta prioridade
    const trigger =
      Platform.OS === 'android' && channelId ? { channelId } : null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        color: '#00D09E',
        badge,
      },
      trigger,
    });

    return identifier;
  } catch (error) {
    console.error('[NotificationService] Falha ao disparar notificação local:', error);
    return undefined;
  }
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

  if (typeof param1 === 'object' && param1 !== null) {
    // Recebeu objeto Transaction
    merchant = param1.merchant;
    amountCents = param1.amount;
    bankName = (typeof param2 === 'string' ? param2 : '') || 'Finz';
    isCredit = param1.type === 'REFUND';
  } else {
    // Recebeu (merchant, amountCents, bankName)
    merchant = param1;
    amountCents = typeof param2 === 'number' ? param2 : 0;
    bankName = param3 || 'Finz';
    isCredit = amountCents < 0;
  }

  const isPix = /pix/i.test(merchant);
  const formattedAmount = formatCentsToBRL(Math.abs(amountCents));

  let title: string;
  let body: string;

  if (isPix) {
    if (isCredit) {
      title = `Pix Recebido • ${bankName}`;
      body = `Você recebeu ${formattedAmount} via Pix: ${merchant}`;
    } else {
      title = `Pix Enviado • ${bankName}`;
      body = `Envio de ${formattedAmount} via Pix: ${merchant}`;
    }
  } else {
    if (isCredit) {
      title = `Crédito Recebido • ${bankName}`;
      body = `${merchant}: ${formattedAmount} creditado`;
    } else {
      title = `Nova Transação • ${bankName}`;
      body = `${merchant}: ${formattedAmount} debitado`;
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
    oldBalanceCents = arg2;
    newBalanceCents = arg3;
  } else {
    newBalanceCents = arg2;
  }

  const formattedNew = formatCentsToBRL(newBalanceCents);
  const title = `Saldo Atualizado - ${bankName}`;

  let body: string;
  if (typeof oldBalanceCents === 'number') {
    const formattedOld = formatCentsToBRL(oldBalanceCents);
    body = `Saldo alterado de ${formattedOld} para ${formattedNew}.`;
  } else {
    body = `Seu novo saldo em ${bankName} é ${formattedNew}.`;
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
  notifyNewTransaction,
  notifyBalanceChange,
  formatCentsToBRL,
  CHANNELS: NOTIFICATION_CHANNELS,
};

export default notificationService;
