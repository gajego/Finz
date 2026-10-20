import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Eye,
  EyeOff,
  RefreshCw,
  Landmark,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Bell,
  CheckCircle2,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { usePluggyDiagnostic } from '@/services/pluggy/pluggyMonitor';
import { sendTestNotification } from '@/services/notifications/notificationService';

interface BalanceHeroProps {
  onOpenPluggy?: () => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const BalanceHero: React.FC<BalanceHeroProps> = ({
  onOpenPluggy,
  onSyncNow,
  isSyncing = false,
}) => {
  const { colors, mode } = useTheme();
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const togglePrivacyMode = useWalletStore((s) => s.togglePrivacyMode);
  const cards = useWalletStore((s) => s.cards);
  const activeCardIndex = useWalletStore((s) => s.activeCardIndex);
  const diagnostic = usePluggyDiagnostic();

  const handleTestNotification = async () => {
    await sendTestNotification();
  };

  const currentCard = cards[activeCardIndex] || cards[0];

  const formatBRL = (cents: number) => {
    if (privacyMode) return 'R$ ••••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const currentBalance = currentCard?.balance || 0;
  const currentLimit = currentCard?.limit || 0;
  const availableLimit = currentCard ? Math.max(0, currentLimit - currentBalance) : 0;
  const usagePercent =
    currentCard && currentLimit > 0
      ? Math.min(Math.round((currentBalance / currentLimit) * 100), 100)
      : 0;
  const freePercent = Math.max(0, 100 - usagePercent);

  // Status dinâmico em 3 níveis harmônico com CategoryBreakdown
  const isCritical = usagePercent > 90;
  const isWarning = usagePercent >= 70 && usagePercent <= 90;

  const statusColor = isCritical
    ? colors.danger
    : isWarning
    ? colors.warning
    : colors.success;

  const statusBg = isCritical
    ? colors.dangerSubtle
    : isWarning
    ? colors.warningSubtle
    : colors.successSubtle;

  const statusBorder = isCritical
    ? mode === 'dark'
      ? 'rgba(255, 59, 48, 0.28)'
      : 'rgba(225, 29, 72, 0.2)'
    : isWarning
    ? mode === 'dark'
      ? 'rgba(245, 158, 11, 0.25)'
      : 'rgba(217, 119, 6, 0.2)'
    : mode === 'dark'
    ? 'rgba(16, 185, 129, 0.25)'
    : 'rgba(5, 150, 105, 0.2)';

  return (
    <View style={styles.container}>
      {/* Topo do Hero: Identificador do Cartão Ativo & Toggle de Privacidade */}
      <View style={styles.topRow}>
        <View style={styles.bankLabelGroup}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
            FATURA ATUAL • {currentCard ? currentCard.bankName.toUpperCase() : 'NENHUM CARTÃO'}
          </Text>
        </View>

        <Pressable
          onPress={togglePrivacyMode}
          hitSlop={12}
          style={({ pressed }) => [
            styles.eyeBtn,
            {
              backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.surface,
              borderColor: colors.borderStrong,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          {privacyMode ? (
            <EyeOff size={14} color={colors.textSecondary} />
          ) : (
            <Eye size={14} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {/* Saldo Principal Brutalista com Tabular Nums */}
      <View style={styles.balanceContainer}>
        <Text
          style={[
            styles.balanceText,
            { color: colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatBRL(currentBalance)}
        </Text>
      </View>

      {/* Badge de Limite Disponível em Harmonia com Metas */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: statusBg,
              borderColor: statusBorder,
            },
          ]}
        >
          {isCritical ? (
            <AlertTriangle size={12} color={statusColor} />
          ) : (
            <ArrowUpRight size={13} color={statusColor} />
          )}

          <Text style={[styles.statusText, { color: statusColor }]}>
            {currentCard
              ? `Disponível: ${formatBRL(availableLimit)}`
              : 'Nenhum limite ativo'}
          </Text>

          {currentCard && currentLimit > 0 && (
            <Text style={[styles.statusSecondaryText, { color: statusColor, opacity: 0.85 }]}>
              • {freePercent}% livre
            </Text>
          )}
        </View>

        {currentCard?.bankBalance !== undefined && currentCard.bankBalance > 0 && (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: mode === 'dark' ? 'rgba(0, 208, 158, 0.1)' : 'rgba(0, 208, 158, 0.08)',
                borderColor: mode === 'dark' ? 'rgba(0, 208, 158, 0.3)' : 'rgba(0, 208, 158, 0.2)',
              },
            ]}
          >
            <ShieldCheck size={12} color="#00D09E" />
            <Text style={[styles.statusText, { color: '#00D09E' }]}>
              Conta: {formatBRL(currentCard.bankBalance)}
            </Text>
          </View>
        )}
      </View>

      {/* Botão de Ação: Sincronização Open Finance Pluggy */}
      <View style={styles.actionsBar}>
        <Pressable
          onPress={currentCard ? onSyncNow : onOpenPluggy}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.actionIconBox,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            {isSyncing ? (
              <RefreshCw size={15} color={colors.primary} />
            ) : currentCard ? (
              <RefreshCw size={15} color={colors.primary} />
            ) : (
              <Landmark size={15} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {isSyncing
              ? 'ATUALIZANDO DADOS OPEN FINANCE...'
              : currentCard
              ? 'SINCRONIZAR BANCO • OPEN FINANCE'
              : 'CONECTAR BANCO • OPEN FINANCE'}
          </Text>
        </Pressable>
      </View>

      {/* Barra de Diagnóstico da Requisição Teste de 10s e Teste de Notificação */}
      <View style={styles.diagnosticBar}>
        <Pressable
          onPress={onOpenPluggy}
          style={[
            styles.diagPill,
            {
              backgroundColor:
                diagnostic.status === 'error'
                  ? colors.dangerSubtle
                  : diagnostic.status === 'success'
                  ? colors.successSubtle
                  : colors.surfaceElevated,
              borderColor:
                diagnostic.status === 'error'
                  ? mode === 'dark' ? 'rgba(255, 59, 48, 0.4)' : 'rgba(225, 29, 72, 0.3)'
                  : diagnostic.status === 'success'
                  ? mode === 'dark' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.3)'
                  : colors.borderSubtle,
            },
          ]}
        >
          {diagnostic.status === 'error' ? (
            <AlertCircle size={12} color={colors.danger} />
          ) : diagnostic.status === 'success' ? (
            <CheckCircle2 size={12} color={colors.success} />
          ) : (
            <RefreshCw size={12} color={colors.textSecondary} />
          )}
          <Text
            style={[
              styles.diagText,
              {
                color:
                  diagnostic.status === 'error'
                    ? colors.danger
                    : diagnostic.status === 'success'
                    ? colors.success
                    : colors.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            {diagnostic.status === 'error'
              ? `Teste 10s: ${diagnostic.message}`
              : diagnostic.status === 'success'
              ? `Sync 10s Ativo • ${diagnostic.message}`
              : 'Verificação 10s em andamento...'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleTestNotification}
          style={({ pressed }) => [
            styles.testNotifBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Bell size={11} color={colors.primary} />
          <Text style={[styles.testNotifText, { color: colors.primary }]}>
            TESTAR NOTIF
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bankLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  eyeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContainer: {
    marginVertical: 4,
  },
  balanceText: {
    fontFamily: Typography.bold,
    fontSize: 40,
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 18,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  statusSecondaryText: {
    fontFamily: Typography.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  actionsBar: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  diagnosticBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  diagPill: {
    flex: 1,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  diagText: {
    flex: 1,
    fontFamily: Typography.medium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  testNotifBtn: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  testNotifText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
