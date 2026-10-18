import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, X, ArrowUpRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface AlertBannerProps {
  onOpenBudgetManager: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onOpenBudgetManager }) => {
  const { colors } = useTheme();
  const alert = useWalletStore((s) => s.activeAlert);
  const dismissAlert = useWalletStore((s) => s.dismissAlert);

  if (!alert) return null;

  const isExceeded = alert.percent >= 100;

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      exiting={FadeOutUp.duration(300)}
      style={styles.wrapper}
    >
      <View style={[styles.container, isExceeded ? styles.containerExceeded : styles.containerWarning]}>
        {/* Linha de Alerta de Perigo */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={13} color="#FF3B30" />
            </View>
            <Text style={styles.alertBadgeText}>
              {isExceeded ? 'LIMITE MENSAL ESTOURADO' : 'ALERTA CRÍTICO DE META'}
            </Text>
          </View>
          <Pressable onPress={dismissAlert} hitSlop={10} style={styles.closeBtn}>
            <X size={14} color="rgba(255, 255, 255, 0.7)" />
          </Pressable>
        </View>

        {/* Mensagem Direta do Alerta */}
        <Text style={styles.alertHeadline}>
          Você já consumiu <Text style={styles.highlightPercent}>{alert.percent}%</Text> da sua meta em{' '}
          <Text style={styles.categoryName}>{alert.categoryName}</Text>.
        </Text>

        <Text style={styles.numbersDetail}>
          Total gasto: {formatBRL(alert.spent)} de {formatBRL(alert.limit)} estipulados.
        </Text>

        {/* Ação rápida para ajustar a meta */}
        <Pressable
          onPress={() => {
            dismissAlert();
            onOpenBudgetManager();
          }}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.actionBtnText}>AJUSTAR TETO DESTA CATEGORIA</Text>
          <ArrowUpRight size={13} color="#FFFFFF" />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  container: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  containerWarning: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.32)',
    shadowColor: '#FF3B30',
  },
  containerExceeded: {
    backgroundColor: 'rgba(255, 59, 48, 0.16)',
    borderColor: 'rgba(255, 59, 48, 0.45)',
    shadowColor: '#FF3B30',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: '#FF3B30',
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertHeadline: {
    color: '#FFFFFF',
    fontFamily: Typography.medium,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  highlightPercent: {
    color: '#FF3B30',
    fontFamily: Typography.bold,
  },
  categoryName: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    textDecorationLine: 'underline',
  },
  numbersDetail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Typography.regular,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginBottom: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF3B30',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});

