import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Eye, EyeOff, FileText, SlidersHorizontal, ShieldAlert, ArrowUpRight } from 'lucide-react-native';
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

  return (
    <View style={styles.container}>
      {/* Topo do Hero: Rótulo e Olho de Privacidade */}
      <View style={styles.labelRow}>
        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
          FATURA ATUAL • {currentCard ? currentCard.bankName : 'NENHUM CARTÃO'}
        </Text>
        <Pressable
          onPress={togglePrivacyMode}
          hitSlop={12}
          style={[styles.eyeBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
        >
          {privacyMode ? (
            <EyeOff size={14} color={colors.textSecondary} />
          ) : (
            <Eye size={14} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {/* Saldo Brutalista Grande com Tabular Nums */}
      <View style={styles.balanceRow}>
        <Text
          style={[
            styles.balanceText,
            { color: colors.text },
          ]}
          numberOfLines={1}
        >
          {formatBRL(currentCard?.balance || 0)}
        </Text>
      </View>

      {/* Badge de Rendimento / Status em Pill */}
      <View style={styles.statusRow}>
        <View style={[styles.badge, { backgroundColor: colors.successSubtle }]}>
          <ArrowUpRight size={13} color={colors.success} />
          <Text style={[styles.badgeText, { color: colors.success }]}>
            {currentCard ? `Limite Total: ${formatBRL(currentCard.limit || 0)}` : 'Nenhum limite ativo'}
          </Text>
        </View>
      </View>

      {/* Barra de Ações Rápidas Táteis em Squircles Elegantes */}
      <View style={styles.actionsBar}>
        <Pressable
          onPress={onOpenReceiptPicker}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <FileText size={15} color={colors.primary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>COMPROVANTE</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <SlidersHorizontal size={15} color={colors.textSecondary} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>LIMITES</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.actionIconBox, { backgroundColor: colors.dangerSubtle }]}>
            <ShieldAlert size={15} color={colors.danger} />
          </View>
          <Text style={[styles.actionText, { color: colors.text }]}>BLOQUEAR</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaLabel: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  eyeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceRow: {
    marginBottom: 6,
  },
  balanceText: {
    fontFamily: Typography.bold,
    fontSize: 38,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
