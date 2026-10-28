import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface BalanceHeroProps {
  onOpenPluggy?: () => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const BalanceHero: React.FC<BalanceHeroProps> = () => {
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
  const bankTitle = currentCard ? currentCard.bankName : 'Nenhum cartão';

  return (
    <View style={styles.container}>
      {/* Topo do Hero: Identificador do Cartão Ativo & Toggle de Privacidade */}
      <View style={styles.topRow}>
        <View style={styles.bankLabelGroup}>
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
            Fatura atual · {bankTitle}
          </Text>
        </View>

        <Pressable
          onPress={togglePrivacyMode}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
          style={({ pressed }) => [
            styles.eyeBtn,
            {
              backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.surface,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          {privacyMode ? (
            <EyeOff size={16} color={colors.textSecondary} />
          ) : (
            <Eye size={16} color={colors.textSecondary} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
  },
  metaLabel: {
    fontFamily: Typography.medium,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContainer: {
    marginVertical: 4,
  },
  balanceText: {
    fontFamily: Typography.bold,
    fontSize: 38,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
});
