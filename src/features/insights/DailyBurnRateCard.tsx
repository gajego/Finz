import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Flame, CheckCircle2, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { calculateDailyBurnRate } from './insightsEngine';

interface DailyBurnRateCardProps {
  onPressDetails?: () => void;
  noMargin?: boolean;
}

export const DailyBurnRateCard: React.FC<DailyBurnRateCardProps> = ({ onPressDetails, noMargin }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const burnRate = useMemo(() => {
    return calculateDailyBurnRate(transactions, categories);
  }, [transactions, categories]);

  // Se não há orçamento mensal configurado em nenhuma categoria
  if (burnRate.totalMonthlyBudget <= 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            marginHorizontal: noMargin ? 0 : 16,
            borderStyle: 'dashed',
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View
              style={[
                styles.iconSquircle,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Flame size={18} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                RITMO DIÁRIO & PACING
              </Text>
              <Text style={[styles.headline, { color: colors.text }]} numberOfLines={1}>
                Cota Diária Segura
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.background,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              Sem Metas
            </Text>
          </View>
        </View>

        <View style={styles.emptyBurnRateContent}>
          <Text style={[styles.emptyBurnRateText, { color: colors.textSecondary }]}>
            O ritmo diário e a cota segura dependem do seu teto orçamentário. Defina limites de gastos nas suas categorias (na aba Metas) para ativar este cálculo.
          </Text>
        </View>
      </View>
    );
  }

  const statusConfig = {
    HEALTHY: {
      color: colors.success || '#10B981',
      bg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
      label: 'Dentro da Meta',
      Icon: CheckCircle2,
    },
    ON_LIMIT: {
      color: colors.warning || '#F59E0B',
      bg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
      label: 'No Limite',
      Icon: AlertTriangle,
    },
    OVERPACED: {
      color: colors.danger || '#EF4444',
      bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      label: 'Acima do Ritmo',
      Icon: AlertCircle,
    },
    EXCEEDED: {
      color: colors.danger || '#EF4444',
      bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      label: 'Teto Esgotado',
      Icon: AlertCircle,
    },
  }[burnRate.status];

  const todayRatio = burnRate.safeDailyQuota > 0
    ? Math.min(1, burnRate.todaySpent / burnRate.safeDailyQuota)
    : 1;

  return (
    <Pressable
      onPress={onPressDetails}
      disabled={!onPressDetails}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          marginHorizontal: noMargin ? 0 : 16,
          transform: [{ scale: pressed && onPressDetails ? 0.985 : 1 }],
        },
      ]}
    >
      {/* Topo do Card */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: statusConfig.bg,
                borderColor: `${statusConfig.color}40`,
              },
            ]}
          >
            <Flame size={16} color={statusConfig.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              RITMO DE GASTO DIÁRIO
            </Text>
            <Text style={[styles.headline, { color: colors.text }]} numberOfLines={1}>
              {burnRate.headline}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: statusConfig.bg,
              borderColor: `${statusConfig.color}50`,
            },
          ]}
        >
          <statusConfig.Icon size={11} color={statusConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Valor Central da Cota */}
      <View style={styles.quotaRow}>
        <Text
          style={[styles.quotaValue, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {formatBRL(burnRate.safeDailyQuota, privacyMode)}
        </Text>
        <Text style={[styles.quotaUnit, { color: colors.textSecondary }]}>
          / dia até o fim do mês
        </Text>
      </View>

      {/* Barra de Progresso do Gasto de Hoje */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.round(todayRatio * 100)}%`,
                backgroundColor: statusConfig.color,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabelText, { color: colors.textMuted }]}>
            Gasto hoje: {formatBRL(burnRate.todaySpent, privacyMode)}
          </Text>
          <Text style={[styles.progressLabelText, { color: colors.textMuted }]}>
            Restam {burnRate.daysRemaining} dias
          </Text>
        </View>
      </View>

      {/* Subtexto e Call to Action */}
      <View style={styles.footerRow}>
        <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={2}>
          {burnRate.subtext}
        </Text>
        {onPressDetails && (
          <ChevronRight size={16} color={colors.textMuted} style={styles.chevron} />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  iconSquircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  eyebrow: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  headline: {
    fontFamily: Typography.bold,
    fontSize: 14,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  quotaValue: {
    fontFamily: Typography.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  quotaUnit: {
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progressLabelText: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  subtext: {
    fontFamily: Typography.regular,
    fontSize: 11,
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  emptyBurnRateContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  emptyBurnRateText: {
    fontFamily: Typography.regular,
    fontSize: 11.5,
    lineHeight: 16,
  },
});
