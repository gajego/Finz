import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { G, Circle } from 'react-native-svg';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  PieChart as PieIcon,
  BarChart2,
} from 'lucide-react-native';
import { Category, Transaction } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { getCategoryIconComponent } from '@/features/categories/categoryIcons';

const AnimatedCompareBar: React.FC<{
  widthPct: number;
  color: string;
  barTrackStyle: any;
  barFillStyle: any;
}> = ({ widthPct, color, barTrackStyle, barFillStyle }) => {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(Math.min(widthPct, 100), {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [widthPct]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={barTrackStyle}>
      <Animated.View style={[barFillStyle, { backgroundColor: color }, animStyle]} />
    </View>
  );
};

export const PerformanceScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  // Timestamps do mês atual e mês anterior
  const {
    currentMonthStart,
    currentMonthEnd,
    prevMonthStart,
    prevMonthEnd,
    currentMonthLabel,
    prevMonthLabel,
  } = useMemo(() => {
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const pEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

    const curLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const pDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const pLabel = pDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return {
      currentMonthStart: curStart,
      currentMonthEnd: curEnd,
      prevMonthStart: pStart,
      prevMonthEnd: pEnd,
      currentMonthLabel: curLabel.charAt(0).toUpperCase() + curLabel.slice(1),
      prevMonthLabel: pLabel.charAt(0).toUpperCase() + pLabel.slice(1),
    };
  }, []);

  // Consolidação de gastos por categoria para o mês atual e anterior
  const {
    categoryStats,
    totalCurrentSpent,
    totalPrevSpent,
    overBudgetCategories,
    totalOverBudgetDiff,
  } = useMemo(() => {
    const curMap: Record<string, number> = {};
    const prevMap: Record<string, number> = {};

    let totalCur = 0;
    let totalPrev = 0;

    for (const t of transactions) {
      if (t.type !== 'EXPENSE') continue;

      if (t.timestamp >= currentMonthStart && t.timestamp <= currentMonthEnd) {
        curMap[t.categoryId] = (curMap[t.categoryId] || 0) + t.amount;
        totalCur += t.amount;
      } else if (t.timestamp >= prevMonthStart && t.timestamp <= prevMonthEnd) {
        prevMap[t.categoryId] = (prevMap[t.categoryId] || 0) + t.amount;
        totalPrev += t.amount;
      }
    }

    // Mapeamento enriquecido por categoria
    const stats = categories.map((cat) => {
      const current = curMap[cat.id] || 0;
      const previous = prevMap[cat.id] || 0;
      const budget = cat.budgetLimit || 0;
      const isOver = budget > 0 && current > budget;
      const overAmount = isOver ? current - budget : 0;
      const diff = current - previous;
      const percentChange =
        previous > 0
          ? Math.round(((current - previous) / previous) * 100)
          : current > 0
          ? 100
          : 0;

      const shareOfTotal = totalCur > 0 ? (current / totalCur) * 100 : 0;

      return {
        category: cat,
        currentSpent: current,
        prevSpent: previous,
        budget,
        isOver,
        overAmount,
        diff,
        percentChange,
        shareOfTotal,
      };
    });

    // Ordenar categorias pelo maior gasto no mês atual
    stats.sort((a, b) => b.currentSpent - a.currentSpent);

    const overList = stats.filter((s) => s.isOver);
    const sumOver = overList.reduce((acc, curr) => acc + curr.overAmount, 0);

    return {
      categoryStats: stats,
      totalCurrentSpent: totalCur,
      totalPrevSpent: totalPrev,
      overBudgetCategories: overList,
      totalOverBudgetDiff: sumOver,
    };
  }, [categories, transactions, currentMonthStart, currentMonthEnd, prevMonthStart, prevMonthEnd]);

  // Variação global do mês
  const overallDiff = totalCurrentSpent - totalPrevSpent;
  const overallPercentChange =
    totalPrevSpent > 0
      ? Math.round(((totalCurrentSpent - totalPrevSpent) / totalPrevSpent) * 100)
      : totalCurrentSpent > 0
      ? 100
      : 0;

  // Parâmetros do Donut Chart SVG
  const chartSize = 180;
  const strokeWidth = 24;
  const radius = (chartSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Fatias do Donut Chart para categorias com gasto
  const chartSlices = useMemo(() => {
    if (totalCurrentSpent <= 0) return [];

    let accumulatedPercent = 0;
    return categoryStats
      .filter((s) => s.currentSpent > 0)
      .map((item) => {
        const sliceRatio = item.currentSpent / totalCurrentSpent;
        const strokeDasharray = `${sliceRatio * circumference} ${circumference}`;
        const strokeDashoffset = -accumulatedPercent * circumference;
        accumulatedPercent += sliceRatio;

        return {
          id: item.category.id,
          color: item.category.color || colors.primary,
          strokeDasharray,
          strokeDashoffset,
        };
      });
  }, [categoryStats, totalCurrentSpent, circumference, colors.primary]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Editorial */}
        <View style={styles.header}>
          <Text style={[styles.screenEyebrow, { color: colors.primary }]}>
            ANÁLISE & MÉTRICAS
          </Text>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            DESEMPENHO
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            {currentMonthLabel} em comparação com {prevMonthLabel}
          </Text>
        </View>

        {/* Hero Cards: Resumo Geral */}
        <View style={styles.kpiRow}>
          {/* Card 1: Gasto Atual */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              GASTO NO MÊS
            </Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {privacyMode ? '••••••' : formatBRL(totalCurrentSpent)}
            </Text>
            <View style={styles.kpiBadgeRow}>
              {overallDiff > 0 ? (
                <View
                  style={[
                    styles.trendBadge,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' },
                  ]}
                >
                  <ArrowUpRight size={13} color={colors.danger} />
                  <Text style={[styles.trendBadgeText, { color: colors.danger }]}>
                    +{overallPercentChange}%
                  </Text>
                </View>
              ) : overallDiff < 0 ? (
                <View
                  style={[
                    styles.trendBadge,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' },
                  ]}
                >
                  <ArrowDownRight size={13} color={colors.success} />
                  <Text style={[styles.trendBadgeText, { color: colors.success }]}>
                    {overallPercentChange}%
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.trendBadge,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                  ]}
                >
                  <Minus size={13} color={colors.textSecondary} />
                  <Text style={[styles.trendBadgeText, { color: colors.textSecondary }]}>
                    0%
                  </Text>
                </View>
              )}
              <Text style={[styles.trendSubtext, { color: colors.textMuted }]}>
                vs mês anterior
              </Text>
            </View>
          </View>

          {/* Card 2: Status dos Tetos */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.surface,
                borderColor:
                  overBudgetCategories.length > 0 ? colors.danger : colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              STATUS DOS TETOS
            </Text>
            <Text
              style={[
                styles.kpiValue,
                { color: overBudgetCategories.length > 0 ? colors.danger : colors.success },
              ]}
            >
              {overBudgetCategories.length > 0
                ? `${overBudgetCategories.length} estourado${overBudgetCategories.length > 1 ? 's' : ''}`
                : '100% no teto'}
            </Text>
            <View style={styles.kpiBadgeRow}>
              {overBudgetCategories.length > 0 ? (
                <Text style={[styles.trendSubtext, { color: colors.danger }]}>
                  {privacyMode ? '••••••' : `+${formatBRL(totalOverBudgetDiff)} excedidos`}
                </Text>
              ) : (
                <Text style={[styles.trendSubtext, { color: colors.success }]}>
                  Nenhum limite ultrapassado
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* SEÇÃO 1: Tetos Ultrapassados (Destaque Crítico) */}
        {overBudgetCategories.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View
                  style={[
                    styles.iconPill,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)' },
                  ]}
                >
                  <AlertTriangle size={16} color={colors.danger} />
                </View>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                    TETOS ULTRAPASSADOS
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Categorias que excederam o orçamento estipulado
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.overBudgetList}>
              {overBudgetCategories.map((item) => {
                const IconComponent = getCategoryIconComponent(item.category.icon);
                const pct = Math.round((item.currentSpent / item.budget) * 100);

                return (
                  <View
                    key={item.category.id}
                    style={[
                      styles.overBudgetCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.25)',
                      },
                    ]}
                  >
                    <View style={styles.overBudgetCardHeader}>
                      <View style={styles.overBudgetCategoryInfo}>
                        <View
                          style={[
                            styles.categoryIconBox,
                            { backgroundColor: `${item.category.color}22` },
                          ]}
                        >
                          <IconComponent size={18} color={item.category.color} />
                        </View>
                        <View>
                          <Text style={[styles.overBudgetName, { color: colors.text }]}>
                            {item.category.name}
                          </Text>
                          <Text style={[styles.overBudgetLimits, { color: colors.textSecondary }]}>
                            Teto: {privacyMode ? '••••••' : formatBRL(item.budget)} • Gasto:{' '}
                            {privacyMode ? '••••••' : formatBRL(item.currentSpent)}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.overBudgetTag,
                          { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)' },
                        ]}
                      >
                        <Text style={[styles.overBudgetTagText, { color: colors.danger }]}>
                          {pct}%
                        </Text>
                      </View>
                    </View>

                    {/* Barra de Progresso Estourada */}
                    <View
                      style={[
                        styles.progressBarTrack,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: '100%',
                            backgroundColor: colors.danger,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.overBudgetFooter}>
                      <Text style={[styles.overBudgetExceededText, { color: colors.danger }]}>
                        Excedeu {privacyMode ? '••••••' : formatBRL(item.overAmount)} do teto planejado
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SEÇÃO 2: Gráfico de Gastos por Categoria (Donut Chart) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.iconPill,
                  { backgroundColor: isDark ? 'rgba(217, 249, 32, 0.18)' : 'rgba(0, 0, 0, 0.06)' },
                ]}
              >
                <PieIcon size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  DISTRIBUIÇÃO DE GASTOS
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Divisão percentual das categorias no mês atual
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.chartContainerCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            {totalCurrentSpent > 0 ? (
              <>
                {/* SVG Donut Chart Centralizado */}
                <View style={styles.donutWrapper}>
                  <Svg width={chartSize} height={chartSize}>
                    <G rotation="-90" origin={`${chartSize / 2}, ${chartSize / 2}`}>
                      {/* Trilha de Fundo do Círculo */}
                      <Circle
                        cx={chartSize / 2}
                        cy={chartSize / 2}
                        r={radius}
                        stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                      />
                      {/* Fatias das Categorias */}
                      {chartSlices.map((slice) => (
                        <Circle
                          key={slice.id}
                          cx={chartSize / 2}
                          cy={chartSize / 2}
                          r={radius}
                          stroke={slice.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      ))}
                    </G>
                  </Svg>

                  {/* Informação no Centro do Donut */}
                  <View style={styles.donutCenterInfo}>
                    <Text style={[styles.donutCenterLabel, { color: colors.textSecondary }]}>
                      TOTAL
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.donutCenterValue, { color: colors.text }]}
                    >
                      {privacyMode ? '••••••' : formatBRL(totalCurrentSpent)}
                    </Text>
                  </View>
                </View>

                {/* Lista / Legenda das Categorias com % de Gasto */}
                <View style={styles.legendContainer}>
                  {categoryStats
                    .filter((item) => item.currentSpent > 0)
                    .map((item) => {
                      const IconComponent = getCategoryIconComponent(item.category.icon);

                      return (
                        <View key={item.category.id} style={styles.legendRow}>
                          <View style={styles.legendLeft}>
                            <View
                              style={[
                                styles.legendColorDot,
                                { backgroundColor: item.category.color },
                              ]}
                            />
                            <View
                              style={[
                                styles.legendIconBox,
                                { backgroundColor: `${item.category.color}22` },
                              ]}
                            >
                              <IconComponent size={14} color={item.category.color} />
                            </View>
                            <Text
                              numberOfLines={1}
                              style={[styles.legendName, { color: colors.text }]}
                            >
                              {item.category.name}
                            </Text>
                          </View>

                          <View style={styles.legendRight}>
                            <Text style={[styles.legendAmount, { color: colors.text }]}>
                              {privacyMode ? '••••••' : formatBRL(item.currentSpent)}
                            </Text>
                            <View
                              style={[
                                styles.legendSharePill,
                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                              ]}
                            >
                              <Text
                                style={[styles.legendShareText, { color: colors.textSecondary }]}
                              >
                                {item.shareOfTotal.toFixed(1)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </View>
              </>
            ) : (
              <View style={styles.emptyChartBox}>
                <Layers size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyChartTitle, { color: colors.text }]}>
                  Nenhuma despesa registrada
                </Text>
                <Text style={[styles.emptyChartSubtitle, { color: colors.textSecondary }]}>
                  Suas categorias serão exibidas aqui conforme as compras deste mês forem realizadas.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* SEÇÃO 3: Comparativo com o Mês Passado */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.iconPill,
                  { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)' },
                ]}
              >
                <BarChart2 size={16} color={colors.secondary} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  COMPARATIVO MÊS A MÊS
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  {currentMonthLabel} vs {prevMonthLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Cards Comparativos por Categoria */}
          <View style={styles.comparisonList}>
            {categoryStats
              .filter((item) => item.currentSpent > 0 || item.prevSpent > 0)
              .map((item) => {
                const IconComponent = getCategoryIconComponent(item.category.icon);
                const maxSpent = Math.max(item.currentSpent, item.prevSpent, 1);
                const curWidthPct = Math.max(8, Math.round((item.currentSpent / maxSpent) * 100));
                const prevWidthPct = Math.max(8, Math.round((item.prevSpent / maxSpent) * 100));

                const isHigher = item.diff > 0;
                const isLower = item.diff < 0;

                return (
                  <View
                    key={item.category.id}
                    style={[
                      styles.comparisonCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.comparisonHeader}>
                      <View style={styles.comparisonCategoryInfo}>
                        <View
                          style={[
                            styles.categoryIconBox,
                            { backgroundColor: `${item.category.color}22` },
                          ]}
                        >
                          <IconComponent size={16} color={item.category.color} />
                        </View>
                        <Text style={[styles.comparisonCategoryName, { color: colors.text }]}>
                          {item.category.name}
                        </Text>
                      </View>

                      {/* Badge de Variação */}
                      {isHigher ? (
                        <View
                          style={[
                            styles.trendBadge,
                            { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.1)' },
                          ]}
                        >
                          <ArrowUpRight size={13} color={colors.danger} />
                          <Text style={[styles.trendBadgeText, { color: colors.danger }]}>
                            +{item.percentChange}% (+{privacyMode ? '••' : formatBRL(item.diff)})
                          </Text>
                        </View>
                      ) : isLower ? (
                        <View
                          style={[
                            styles.trendBadge,
                            { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.1)' },
                          ]}
                        >
                          <ArrowDownRight size={13} color={colors.success} />
                          <Text style={[styles.trendBadgeText, { color: colors.success }]}>
                            {item.percentChange}% ({privacyMode ? '••' : formatBRL(item.diff)})
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.trendBadge,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' },
                          ]}
                        >
                          <Minus size={13} color={colors.textSecondary} />
                          <Text style={[styles.trendBadgeText, { color: colors.textSecondary }]}>
                            Estável
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Barras Comparativas Lado a Lado Animadas */}
                    <View style={styles.comparisonBars}>
                      {/* Linha Mês Atual */}
                      <View style={styles.barLine}>
                        <Text style={[styles.barLabel, { color: colors.textSecondary }]}>
                          Este mês
                        </Text>
                        <AnimatedCompareBar
                          widthPct={curWidthPct}
                          color={item.category.color || colors.primary}
                          barTrackStyle={styles.barTrack}
                          barFillStyle={styles.barFill}
                        />
                        <Text style={[styles.barValueText, { color: colors.text }]}>
                          {privacyMode ? '••••••' : formatBRL(item.currentSpent)}
                        </Text>
                      </View>

                      {/* Linha Mês Passado */}
                      <View style={styles.barLine}>
                        <Text style={[styles.barLabel, { color: colors.textMuted }]}>
                          Mês passado
                        </Text>
                        <AnimatedCompareBar
                          widthPct={prevWidthPct}
                          color={isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'}
                          barTrackStyle={styles.barTrack}
                          barFillStyle={styles.barFill}
                        />
                        <Text style={[styles.barValueText, { color: colors.textSecondary }]}>
                          {privacyMode ? '••••••' : formatBRL(item.prevSpent)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  screenEyebrow: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: Typography.bold,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    marginTop: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: Typography.bold,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  kpiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  trendBadgeText: {
    fontSize: 11,
    fontFamily: Typography.bold,
  },
  trendSubtext: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  sectionBlock: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: Typography.regular,
  },
  overBudgetList: {
    gap: 12,
  },
  overBudgetCard: {
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  overBudgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overBudgetCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overBudgetName: {
    fontSize: 15,
    fontFamily: Typography.bold,
  },
  overBudgetLimits: {
    fontSize: 12,
    fontFamily: Typography.regular,
    marginTop: 2,
  },
  overBudgetTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overBudgetTagText: {
    fontSize: 12,
    fontFamily: Typography.bold,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  overBudgetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overBudgetExceededText: {
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  chartContainerCard: {
    padding: 18,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  donutCenterInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 110,
  },
  donutCenterLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 1,
  },
  donutCenterValue: {
    fontSize: 16,
    fontFamily: Typography.bold,
    marginTop: 2,
  },
  legendContainer: {
    marginTop: 18,
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendName: {
    fontSize: 13,
    fontFamily: Typography.medium,
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendAmount: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  legendSharePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 42,
    alignItems: 'center',
  },
  legendShareText: {
    fontSize: 11,
    fontFamily: Typography.medium,
  },
  emptyChartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyChartTitle: {
    fontSize: 15,
    fontFamily: Typography.bold,
    marginTop: 6,
  },
  emptyChartSubtitle: {
    fontSize: 12,
    fontFamily: Typography.regular,
    textAlign: 'center',
    maxWidth: 240,
  },
  comparisonList: {
    gap: 12,
  },
  comparisonCard: {
    padding: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  comparisonCategoryName: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  comparisonBars: {
    gap: 8,
  },
  barLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 72,
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barValueText: {
    width: 78,
    textAlign: 'right',
    fontSize: 12,
    fontFamily: Typography.medium,
  },
});
