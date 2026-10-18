import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Eye,
  EyeOff,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface BalanceHeroProps {
  onOpenReceiptPicker?: () => void;
}

export const BalanceHero: React.FC<BalanceHeroProps> = ({ onOpenReceiptPicker }) => {
  const { colors, mode } = useTheme();
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const togglePrivacyMode = useWalletStore((s) => s.togglePrivacyMode);
  const cards = useWalletStore((s) => s.cards);
  const activeCardIndex = useWalletStore((s) => s.activeCardIndex);

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
      </View>

      {/* Botão de Ação: Leitor / Importador de Comprovantes */}
      <View style={styles.actionsBar}>
        <Pressable
          onPress={onOpenReceiptPicker}
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
            <FileText size={16} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>
            IMPORTAR COMPROVANTE
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
});
