import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, X, ArrowUpRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

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
        {/* Linha Vermelha de Alerta de Perigo */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <AlertTriangle size={15} color="#FF3B30" />
            <Text style={styles.alertBadgeText}>
              {isExceeded ? 'LIMITE MENSAL ESTOURADO' : 'ALERTA CRÍTICO DE META'}
            </Text>
          </View>
          <Pressable onPress={dismissAlert} hitSlop={10} style={styles.closeBtn}>
            <X size={15} color="rgba(255, 255, 255, 0.7)" />
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
          style={styles.actionBtn}
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  containerWarning: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  containerExceeded: {
    backgroundColor: 'rgba(255, 59, 48, 0.22)',
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertBadgeText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  closeBtn: {
    padding: 2,
  },
  alertHeadline: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  highlightPercent: {
    color: '#FF3B30',
    fontWeight: '900',
  },
  categoryName: {
    color: '#FFFFFF',
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  numbersDetail: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF3B30',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
