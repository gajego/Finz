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
        <Pressable onPress={togglePrivacyMode} hitSlop={12} style={styles.eyeBtn}>
          {privacyMode ? (
            <EyeOff size={16} color={colors.textSecondary} />
          ) : (
            <Eye size={16} color={colors.textSecondary} />
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

      {/* Badge de Rendimento / Status */}
      <View style={styles.statusRow}>
        <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
          <ArrowUpRight size={12} color={colors.success} />
          <Text style={[styles.badgeText, { color: colors.success }]}>
            {currentCard ? `Limite Total: ${formatBRL(currentCard.limit || 0)}` : 'Nenhum limite ativo'}
          </Text>
        </View>
      </View>

      {/* Barra de Ações Rápidas Táteis */}
      <View style={styles.actionsBar}>
        <Pressable
          onPress={onOpenReceiptPicker}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <FileText size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.text }]}>COMPROVANTE</Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <SlidersHorizontal size={14} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.text }]}>LIMITES</Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <ShieldAlert size={14} color={colors.danger} />
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
    padding: 2,
  },
  balanceRow: {
    marginBottom: 6,
  },
  balanceText: {
    fontFamily: Typography.bold,
    fontSize: 36,
    letterSpacing: -1,
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
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: Typography.medium,
    fontSize: 11,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 1,
  },

});
