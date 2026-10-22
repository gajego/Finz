import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, X, ChevronRight, Tag } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface AlertBannerProps {
  onOpenBudgetManager: () => void;
  onOpenUncategorized?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  onOpenBudgetManager,
  onOpenUncategorized,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const alert = useWalletStore((s) => s.activeAlert);
  const dismissAlert = useWalletStore((s) => s.dismissAlert);
  const transactions = useWalletStore((s) => s.transactions);

  const [dismissedUncategorized, setDismissedUncategorized] = useState(false);

  const uncategorizedList = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'EXPENSE' &&
        (t.categoryId === 'cat_others' || !t.categoryId || t.categoryId === '')
    );
  }, [transactions]);

  const uncategorizedTotal = useMemo(() => {
    return uncategorizedList.reduce((acc, t) => acc + t.amount, 0);
  }, [uncategorizedList]);

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const showBudgetAlert = !!alert;
  const showUncategorizedAlert =
    !dismissedUncategorized && uncategorizedList.length > 0;

  if (!showBudgetAlert && !showUncategorizedAlert) {
    return null;
  }

  const textColor = isDark ? '#FFFFFF' : '#111827';
  const textMutedColor = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(17, 24, 39, 0.65)';
  const closeIconColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(17, 24, 39, 0.4)';

  return (
    <View style={styles.wrapper}>
      {/* 1. Bannerzinho de Orçamento / Teto Estourado */}
      {showBudgetAlert && alert && (
        <Pressable
          onPress={() => {
            dismissAlert();
            onOpenBudgetManager();
          }}
          style={({ pressed }) => [
            styles.banner,
            styles.bannerBudget,
            { opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <View style={[styles.iconCircle, styles.iconCircleBudget]}>
            <AlertTriangle size={14} color="#FF3B30" strokeWidth={2.4} />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {alert.categoryName}:{' '}
              <Text style={{ color: '#FF3B30', fontFamily: Typography.bold }}>
                {alert.percent}% da meta
              </Text>
            </Text>
            <Text style={[styles.subtitle, { color: textMutedColor }]} numberOfLines={1}>
              {formatBRL(alert.spent)} de {formatBRL(alert.limit)} estipulados
            </Text>
          </View>

          <View style={styles.rightAction}>
            <View style={[styles.actionPill, styles.actionPillBudget]}>
              <Text style={[styles.actionText, { color: '#FF3B30' }]}>Ajustar</Text>
              <ChevronRight size={12} color="#FF3B30" strokeWidth={2.5} />
            </View>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              dismissAlert();
            }}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityLabel="Fechar aviso"
          >
            <X size={13} color={closeIconColor} />
          </Pressable>
        </Pressable>
      )}

      {/* 2. Bannerzinho de Transações Não Categorizadas */}
      {showUncategorizedAlert && (
        <Pressable
          onPress={() => {
            console.log('[AlertBanner] 👉 Clicou no bannerzinho de não categorizadas!');
            onOpenUncategorized?.();
          }}
          style={({ pressed }) => [
            styles.banner,
            styles.bannerUncategorized,
            showBudgetAlert && { marginTop: 6 },
            { opacity: pressed ? 0.82 : 1 },
          ]}
        >
          <View style={[styles.iconCircle, styles.iconCircleUncategorized]}>
            <Tag size={14} color="#F59E0B" strokeWidth={2.4} />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {uncategorizedList.length}{' '}
              {uncategorizedList.length === 1
                ? 'gasto não categorizado'
                : 'gastos não categorizados'}
            </Text>
            <Text style={[styles.subtitle, { color: textMutedColor }]} numberOfLines={1}>
              {formatBRL(uncategorizedTotal)} a classificar
            </Text>
          </View>

          <View style={styles.rightAction}>
            <View style={[styles.actionPill, styles.actionPillUncategorized]}>
              <Text style={[styles.actionText, { color: '#F59E0B' }]}>Categorizar</Text>
              <ChevronRight size={12} color="#F59E0B" strokeWidth={2.5} />
            </View>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setDismissedUncategorized(true);
            }}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityLabel="Fechar aviso"
          >
            <X size={13} color={closeIconColor} />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 6,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bannerBudget: {
    backgroundColor: 'rgba(255, 59, 48, 0.10)',
    borderColor: 'rgba(255, 59, 48, 0.28)',
  },
  bannerUncategorized: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconCircleBudget: {
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
  },
  iconCircleUncategorized: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: Typography.medium,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Typography.regular,
    marginTop: 1,
  },
  rightAction: {
    marginLeft: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actionPillBudget: {
    backgroundColor: 'rgba(255, 59, 48, 0.16)',
  },
  actionPillUncategorized: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  actionText: {
    fontSize: 11,
    fontFamily: Typography.bold,
    marginRight: 2,
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
