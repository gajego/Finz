import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Bitcoin,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Sparkles,
  PackageOpen,
  Link,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import { Investment, InvestmentType } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { syncAllPluggyItems } from '@/services/pluggy/pluggyService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gainPercent(current: number, initial: number): number {
  if (initial === 0) return 0;
  return ((current - initial) / initial) * 100;
}

export function getEffectiveCurrentValue(inv: Investment): number {
  if (inv.currentValue > inv.initialValue) {
    return inv.currentValue;
  }
  // Se o valor salvo ainda for igual ao investido mas houver taxa anual e data de compra:
  if (inv.initialValue > 0 && inv.annualRate && inv.annualRate > 0 && inv.purchaseDate) {
    try {
      const pDate = new Date(inv.purchaseDate.slice(0, 10) + 'T12:00:00');
      const diffDays = Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        const businessDays = Math.max(1, Math.round(diffDays * (252 / 365)));
        const gain = Math.round(inv.initialValue * ((inv.annualRate / 252) * businessDays));
        return inv.initialValue + gain;
      }
    } catch {}
  }
  return inv.currentValue;
}

/** Estimativa de ganho diário linear simples */
function dailyGain(inv: Investment): number {
  const effCurrent = getEffectiveCurrentValue(inv);
  if (inv.annualRate && inv.annualRate > 0) {
    return Math.round((effCurrent * inv.annualRate) / 252);
  }
  const gain = effCurrent - inv.initialValue;
  if (gain > 0 && inv.purchaseDate) {
    try {
      const pDate = new Date(inv.purchaseDate.slice(0, 10) + 'T12:00:00');
      const diffDays = Math.max(1, Math.floor((Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24)));
      const businessDays = Math.max(1, Math.round(diffDays * (252 / 365)));
      return Math.round(gain / businessDays);
    } catch {}
  }
  return 0;
}

/** Estimativa de ganho semanal (5 dias úteis) */
function weeklyGain(inv: Investment): number {
  return dailyGain(inv) * 5;
}

/** Estimativa de ganho mensal (21 dias úteis) */
function monthlyGain(inv: Investment): number {
  return dailyGain(inv) * 21;
}

function typeIcon(type: InvestmentType): React.ComponentType<{ size: number; color: string; strokeWidth?: number }> {
  switch (type) {
    case 'Ações':
    case 'ETF':
      return TrendingUp;
    case 'FII':
      return Landmark;
    case 'Cripto':
      return Bitcoin;
    case 'Tesouro Direto':
      return Landmark;
    default:
      return BarChart2;
  }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const AnimatedBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(pct, 100), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct]);

  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, animStyle]} />
    </View>
  );
};

const SummaryCard: React.FC<{
  totalValue: number;
  totalGain: number;
  dayGain: number;
  weekGain: number;
  monthGain: number;
  privacyMode: boolean;
  colors: any;
  isDark: boolean;
}> = ({ totalValue, totalGain, dayGain, weekGain, monthGain, privacyMode, colors, isDark }) => {
  const gainPct = gainPercent(totalValue, totalValue - totalGain);
  const isPositive = totalGain >= 0;

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.summaryTop}>
        <View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Patrimônio investido
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {privacyMode ? '••••••' : formatBRL(totalValue)}
          </Text>
        </View>
        <View
          style={[
            styles.gainBadge,
            {
              backgroundColor: isPositive
                ? isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)'
                : isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.10)',
            },
          ]}
        >
          {isPositive ? (
            <TrendingUp size={13} color={colors.success} strokeWidth={2.5} />
          ) : (
            <TrendingDown size={13} color={colors.danger} strokeWidth={2.5} />
          )}
          <Text
            style={[
              styles.gainBadgeText,
              { color: isPositive ? colors.success : colors.danger },
            ]}
          >
            {isPositive ? '+' : ''}{gainPct.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={[styles.summaryDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

      <View style={styles.summaryMetrics}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Hoje</Text>
          <Text style={[styles.metricValue, { color: dayGain >= 0 ? colors.success : colors.danger }]}>
            {privacyMode ? '••' : `+${formatBRL(dayGain)}`}
          </Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Semana</Text>
          <Text style={[styles.metricValue, { color: weekGain >= 0 ? colors.success : colors.danger }]}>
            {privacyMode ? '••' : `+${formatBRL(weekGain)}`}
          </Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Mês</Text>
          <Text style={[styles.metricValue, { color: monthGain >= 0 ? colors.success : colors.danger }]}>
            {privacyMode ? '••' : `+${formatBRL(monthGain)}`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const InvestmentCard: React.FC<{
  investment: Investment;
  shareOfTotal: number;
  privacyMode: boolean;
  colors: any;
  isDark: boolean;
}> = ({ investment, shareOfTotal, privacyMode, colors, isDark }) => {
  const [expanded, setExpanded] = useState(false);
  const effectiveCurrent = getEffectiveCurrentValue(investment);
  const gain = effectiveCurrent - investment.initialValue;
  const pct = gainPercent(effectiveCurrent, investment.initialValue);
  const isPositive = gain >= 0;
  const TypeIcon = typeIcon(investment.type);

  const day = dailyGain(investment);
  const week = weeklyGain(investment);
  const month = monthlyGain(investment);

  const scaleAnim = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scaleAnim.value = withSpring(0.985, { damping: 14, stiffness: 350 }); }}
        onPressOut={() => { scaleAnim.value = withSpring(1, { damping: 12, stiffness: 250 }); }}
        onPress={() => setExpanded((v) => !v)}
        style={[
          styles.investCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
          },
        ]}
      >
        {/* Cabeçalho */}
        <View style={styles.investCardHeader}>
          <View style={[styles.typeIconBox, { backgroundColor: `${investment.color}22` }]}>
            <TypeIcon size={18} color={investment.color} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.investName, { color: colors.text }]} numberOfLines={1}>
              {investment.name}
            </Text>
            <Text style={[styles.investMeta, { color: colors.textSecondary }]}>
              {investment.type} · {investment.institution}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[styles.investValue, { color: colors.text }]}>
              {privacyMode ? '••••••' : formatBRL(effectiveCurrent)}
            </Text>
            <View
              style={[
                styles.pctPill,
                {
                  backgroundColor: isPositive
                    ? isDark ? 'rgba(22, 163, 74, 0.18)' : 'rgba(22, 163, 74, 0.10)'
                    : isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.10)',
                },
              ]}
            >
              <Text style={[styles.pctText, { color: isPositive ? colors.success : colors.danger }]}>
                {isPositive ? '+' : ''}{pct.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Barra de participação */}
        <View style={styles.barRow}>
          <AnimatedBar pct={shareOfTotal} color={investment.color} />
          <Text style={[styles.barShareText, { color: colors.textSecondary }]}>
            {shareOfTotal.toFixed(1)}%
          </Text>
        </View>

        {/* Detalhes expandidos */}
        {expanded && (
          <View style={[styles.expandedSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Aplicado</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {privacyMode ? '••••' : formatBRL(investment.initialValue)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ganho total</Text>
                <Text style={[styles.detailValue, { color: isPositive ? colors.success : colors.danger }]}>
                  {privacyMode ? '••••' : (isPositive ? '+' : '') + formatBRL(Math.abs(gain))}
                </Text>
              </View>
              {investment.annualRate != null && (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Taxa a.a.</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {(investment.annualRate * 100).toFixed(2)}%
                  </Text>
                </View>
              )}
              {investment.maturityDate && (
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vencimento</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(investment.maturityDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              )}
            </View>

            {day > 0 && (
              <>
                <View style={[styles.detailDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>
                  RENDIMENTOS ESTIMADOS
                </Text>
                <View style={styles.yieldRow}>
                  <View style={styles.yieldItem}>
                    <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Hoje</Text>
                    <Text style={[styles.yieldValue, { color: colors.success }]}>
                      {privacyMode ? '••' : `+${formatBRL(day)}`}
                    </Text>
                  </View>
                  <View style={styles.yieldItem}>
                    <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Semana</Text>
                    <Text style={[styles.yieldValue, { color: colors.success }]}>
                      {privacyMode ? '••' : `+${formatBRL(week)}`}
                    </Text>
                  </View>
                  <View style={styles.yieldItem}>
                    <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Mês</Text>
                    <Text style={[styles.yieldValue, { color: colors.success }]}>
                      {privacyMode ? '••' : `+${formatBRL(month)}`}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Botão expand/collapse */}
        <View style={styles.expandToggle}>
          {expanded ? (
            <ChevronUp size={14} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={14} color={colors.textSecondary} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── Tela principal ───────────────────────────────────────────────────────────

export const InvestmentsScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const investments = useWalletStore((s) => s.investments);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncAllPluggyItems();
    } catch (e) {
      console.warn('[Investments] Erro ao sincronizar investimentos:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    syncAllPluggyItems().catch(() => {});
  }, []);

  const { totalValue, totalInitial, totalDayGain, totalWeekGain, totalMonthGain } = useMemo(() => {
    const tv = investments.reduce((s, i) => s + getEffectiveCurrentValue(i), 0);
    const ti = investments.reduce((s, i) => s + i.initialValue, 0);
    const tdg = investments.reduce((s, i) => s + dailyGain(i), 0);
    const twg = investments.reduce((s, i) => s + weeklyGain(i), 0);
    const tmg = investments.reduce((s, i) => s + monthlyGain(i), 0);
    return { totalValue: tv, totalInitial: ti, totalDayGain: tdg, totalWeekGain: twg, totalMonthGain: tmg };
  }, [investments]);

  const totalGain = totalValue - totalInitial;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={mode === 'dark' ? colors.surfaceElevated : colors.surface}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIconBox, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : 'rgba(22, 163, 74, 0.10)' }]}>
          <Briefcase size={20} color={colors.success} strokeWidth={2} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Investimentos</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {investments.length > 0 ? `${investments.length} ativos na carteira` : 'Nenhum ativo conectado'}
          </Text>
        </View>
      </View>

      {investments.length === 0 ? (
        /* ── Empty State ── */
        <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={[styles.emptyIconRing, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', borderColor: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(16,185,129,0.15)' }]}>
            <PackageOpen size={30} color={colors.success} strokeWidth={1.8} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nenhum investimento sincronizado
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Conecte sua conta ou corretora via Open Finance para acompanhar sua carteira e rendimentos diários.
          </Text>
        </View>
      ) : (
        <>
          {/* Card resumo */}
          <SummaryCard
            totalValue={totalValue}
            totalGain={totalGain}
            dayGain={totalDayGain}
            weekGain={totalWeekGain}
            monthGain={totalMonthGain}
            privacyMode={privacyMode}
            colors={colors}
            isDark={isDark}
          />

          {/* Lista de investimentos */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Carteira de ativos
          </Text>

          <View style={styles.investList}>
            {investments.map((inv) => {
              const share = totalValue > 0 ? (getEffectiveCurrentValue(inv) / totalValue) * 100 : 0;
              return (
                <InvestmentCard
                  key={inv.id}
                  investment={inv}
                  shareOfTotal={share}
                  privacyMode={privacyMode}
                  colors={colors}
                  isDark={isDark}
                />
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Typography.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    marginTop: 1,
  },
  summaryCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: Typography.bold,
    letterSpacing: -0.5,
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  gainBadgeText: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 14,
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  metricValue: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 1,
    marginBottom: 12,
  },
  investList: {
    gap: 10,
    marginBottom: 20,
  },
  investCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: 14,
  },
  investCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  investName: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  investMeta: {
    fontSize: 11,
    fontFamily: Typography.regular,
    marginTop: 1,
  },
  investValue: {
    fontSize: 15,
    fontFamily: Typography.bold,
  },
  pctPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pctText: {
    fontSize: 11,
    fontFamily: Typography.bold,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.14)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barShareText: {
    fontSize: 11,
    fontFamily: Typography.medium,
    width: 38,
    textAlign: 'right',
  },
  expandToggle: {
    alignItems: 'center',
    marginTop: 6,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  detailItem: {
    minWidth: '40%',
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  detailDivider: {
    height: 1,
    marginVertical: 12,
  },
  detailSectionTitle: {
    fontSize: 9,
    fontFamily: Typography.bold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  yieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yieldItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  yieldLabel: {
    fontSize: 10,
    fontFamily: Typography.regular,
  },
  yieldValue: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  demoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  demoNoteText: {
    fontSize: 11,
    fontFamily: Typography.regular,
    flex: 1,
    lineHeight: 16,
  },
  emptyBox: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginTop: 4,
    width: '100%',
  },
  emptyHintText: {
    fontSize: 11,
    fontFamily: Typography.regular,
    flex: 1,
    lineHeight: 16,
  },
});
