import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  G,
  Circle,
  Path,
  Rect,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Calendar,
  X,
  Activity,
} from 'lucide-react-native';
import { Category, Transaction } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import {
  formatBRL,
  parseMerchantAndInstallments,
  getBrazilDateParts,
} from '@/features/transactions/transactionUtils';
import { getCategoryIconComponent } from '@/features/categories/categoryIcons';
import { FinancialHealthScoreCard } from '@/features/insights/FinancialHealthScoreCard';
import { DailyBurnRateCard } from '@/features/insights/DailyBurnRateCard';
import { Budget503020Card } from '@/features/insights/Budget503020Card';
import { RecurringSubscriptionsCard } from '@/features/insights/RecurringSubscriptionsCard';

/**
 * Gera um traçado suave (spline cúbico) entre os pontos informados.
 */
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

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

interface PerformanceScreenProps {
  onPressTransaction?: (transaction: Transaction) => void;
  onSetScrollEnabled?: (enabled: boolean) => void;
}

interface OverBudgetCategoryCardProps {
  item: {
    category: Category;
    currentSpent: number;
    budget: number;
    isOver: boolean;
    overAmount: number;
  };
  transactions: Transaction[];
  currentMonthStart: number;
  currentMonthEnd: number;
  privacyMode: boolean;
  colors: any;
  isDark: boolean;
  onPressTransaction?: (transaction: Transaction) => void;
}

const OverBudgetCategoryCard: React.FC<OverBudgetCategoryCardProps> = ({
  item,
  transactions,
  currentMonthStart,
  currentMonthEnd,
  privacyMode,
  colors,
  isDark,
  onPressTransaction,
}) => {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = getCategoryIconComponent(item.category.icon);
  const pct = Math.round((item.currentSpent / item.budget) * 100);

  const categoryTransactions = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.categoryId === item.category.id &&
          t.type === 'EXPENSE' &&
          t.timestamp >= currentMonthStart &&
          t.timestamp <= currentMonthEnd
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, item.category.id, currentMonthStart, currentMonthEnd]);

  const visibleTransactions = expanded
    ? categoryTransactions
    : categoryTransactions.slice(0, 4);

  const formatShortDate = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  return (
    <View
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
          <View style={{ flex: 1 }}>
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

      {/* Lista de Itens da Categoria que Estouraram o Teto */}
      {categoryTransactions.length > 0 && (
        <View style={styles.txListContainer}>
          <View style={[styles.txListDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.txListHeader}>
            <Text style={[styles.txListHeaderTitle, { color: colors.textSecondary }]}>
              ITENS DESTA CATEGORIA NO MÊS ({categoryTransactions.length})
            </Text>
          </View>

          <View style={styles.txItemsList}>
            {visibleTransactions.map((tx) => {
              const { cleanName } = parseMerchantAndInstallments(tx.merchant, tx.rawText);
              const dateStr = formatShortDate(tx.timestamp);

              return (
                <Pressable
                  key={tx.id}
                  onPress={() => onPressTransaction?.(tx)}
                  style={({ pressed }) => [
                    styles.txItemRow,
                    {
                      backgroundColor: pressed
                        ? isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)'
                        : 'transparent',
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${cleanName}, ${formatBRL(tx.amount)}, toque para abrir detalhes`}
                >
                  <View style={styles.txItemLeft}>
                    <View
                      style={[
                        styles.txBullet,
                        { backgroundColor: item.category.color || colors.danger },
                      ]}
                    />
                    <View style={styles.txMetaTexts}>
                      <Text
                        style={[styles.txMerchantText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {cleanName}
                      </Text>
                      <Text style={[styles.txDateText, { color: colors.textMuted }]}>
                        {dateStr}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txItemRight}>
                    <Text
                      style={[
                        styles.txAmountText,
                        { color: isDark ? '#F87171' : '#E11D48' },
                      ]}
                    >
                      - {privacyMode ? '••••••' : formatBRL(tx.amount)}
                    </Text>
                    <ChevronRight size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Botão Ver Todas / Recolher */}
          {categoryTransactions.length > 4 && (
            <Pressable
              onPress={() => setExpanded(!expanded)}
              style={({ pressed }) => [
                styles.expandBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.04)',
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.expandBtnText, { color: colors.textSecondary }]}>
                {expanded
                  ? 'Recolher itens'
                  : `Ver todas as ${categoryTransactions.length} movimentações`}
              </Text>
              {expanded ? (
                <ChevronUp size={14} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={14} color={colors.textSecondary} />
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

export const PerformanceScreen: React.FC<PerformanceScreenProps> = ({
  onPressTransaction,
  onSetScrollEnabled,
}) => {
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
    const consideredCategories = categories.filter((c) => c.considerar !== false);
    const consideredCatIds = new Set(consideredCategories.map((c) => c.id));

    const curMap: Record<string, number> = {};
    const prevMap: Record<string, number> = {};

    let totalCur = 0;
    let totalPrev = 0;

    for (const t of transactions) {
      if (t.type !== 'EXPENSE') continue;
      if (!consideredCatIds.has(t.categoryId)) continue;

      if (t.timestamp >= currentMonthStart && t.timestamp <= currentMonthEnd) {
        curMap[t.categoryId] = (curMap[t.categoryId] || 0) + t.amount;
        totalCur += t.amount;
      } else if (t.timestamp >= prevMonthStart && t.timestamp <= prevMonthEnd) {
        prevMap[t.categoryId] = (prevMap[t.categoryId] || 0) + t.amount;
        totalPrev += t.amount;
      }
    }

    // Mapeamento enriquecido por categoria
    const stats = consideredCategories.map((cat) => {
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

  // Controle de Abas Internas da Tela de Desempenho
  type PerformanceTab = 'overview' | 'daily' | 'comparative';
  const [activeTab, setActiveTab] = useState<PerformanceTab>('overview');

  // Estados para o Gráfico de Linha Diário e Detalhamento de Transações
  const categoryScrollRef = useRef<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(() => getBrazilDateParts(Date.now()).day);
  const [showDrilldown, setShowDrilldown] = useState<boolean>(true);

  // Formatação de hora da transação
  const formatTransactionTime = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  // Largura do gráfico ajustada à tela sem necessidade de scroll aninhado
  const screenWidth = Dimensions.get('window').width;
  const svgWidth = Math.max(280, screenWidth - 76);

  // Dias do mês atual e dados diários consolidados
  const {
    daysInMonth,
    todayDay,
    categoryDayMap,
    categoriesWithSpend,
    activeCategory,
    activeDayTransactions,
    activeDayTotal,
    daysWithSpendForActiveCat,
    dailyPoints,
    chartHeight,
    paddingBottom,
    plotHeight,
    plotWidth,
    paddingLeft,
    selectedPoint,
  } = useMemo(() => {
    const consideredCategories = categories.filter((c) => c.considerar !== false);
    const consideredCatIds = new Set(consideredCategories.map((c) => c.id));

    const nowParts = getBrazilDateParts(Date.now());
    const todayDay = nowParts.day;
    const daysInMonth = new Date(nowParts.year, nowParts.month + 1, 0).getDate();

    const catDayMap: Record<string, Record<number, number>> = {};
    const catTotalMap: Record<string, number> = {};

    for (const t of transactions) {
      if (t.type !== 'EXPENSE') continue;
      if (!consideredCatIds.has(t.categoryId)) continue;
      if (t.timestamp < currentMonthStart || t.timestamp > currentMonthEnd) continue;

      const parts = getBrazilDateParts(t.timestamp);
      const d = parts.day;
      const catId = t.categoryId || 'other';

      if (!catDayMap[catId]) catDayMap[catId] = {};
      catDayMap[catId][d] = (catDayMap[catId][d] || 0) + t.amount;
      catTotalMap[catId] = (catTotalMap[catId] || 0) + t.amount;
    }

    // Categorias com gastos no mês (apenas consideradas)
    const catsWithSpend = consideredCategories
      .filter((c) => (catTotalMap[c.id] || 0) > 0)
      .sort((a, b) => (catTotalMap[b.id] || 0) - (catTotalMap[a.id] || 0));

    // Categoria ativa (selecionada ou a de maior gasto)
    const chosenCat =
      catsWithSpend.find((c) => c.id === selectedCategoryId) ||
      catsWithSpend[0] ||
      consideredCategories[0] ||
      null;

    const chosenCatId = chosenCat ? chosenCat.id : null;

    // Dias com gastos na categoria ativa
    const daysWithSpend: number[] = [];
    if (chosenCatId && catDayMap[chosenCatId]) {
      for (let d = 1; d <= daysInMonth; d++) {
        if ((catDayMap[chosenCatId][d] || 0) > 0) {
          daysWithSpend.push(d);
        }
      }
    }

    // Transações do dia selecionado para a categoria ativa
    const dayTxs = chosenCatId
      ? transactions
          .filter((t) => {
            if (t.type !== 'EXPENSE' || t.categoryId !== chosenCatId) return false;
            if (t.timestamp < currentMonthStart || t.timestamp > currentMonthEnd) return false;
            const parts = getBrazilDateParts(t.timestamp);
            return parts.day === selectedDay;
          })
          .sort((a, b) => b.amount - a.amount)
      : [];

    const dayTotal = dayTxs.reduce((sum, t) => sum + t.amount, 0);

    // Dimensões do gráfico ajustado à largura do card
    const chartHeight = 150;
    const paddingBottom = 30;
    const paddingTop = 20;
    const plotHeight = chartHeight - paddingBottom - paddingTop;
    const plotWidth = svgWidth - 28;
    const paddingLeft = 14;

    let maxAmount = 10;
    if (chosenCatId && catDayMap[chosenCatId]) {
      for (let d = 1; d <= daysInMonth; d++) {
        const amt = catDayMap[chosenCatId][d] || 0;
        if (amt > maxAmount) maxAmount = amt;
      }
    }

    const points: { x: number; y: number; amount: number; day: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const amt = (chosenCatId && catDayMap[chosenCatId] ? catDayMap[chosenCatId][d] : 0) || 0;
      const x = paddingLeft + ((d - 1) / Math.max(daysInMonth - 1, 1)) * plotWidth;
      const y = chartHeight - paddingBottom - (amt / (maxAmount * 1.18)) * plotHeight;
      points.push({ x, y, amount: amt, day: d });
    }

    const selectedPoint = points.find((p) => p.day === selectedDay) || null;

    return {
      daysInMonth,
      todayDay,
      categoryDayMap: catDayMap,
      categoriesWithSpend: catsWithSpend,
      activeCategory: chosenCat,
      activeDayTransactions: dayTxs,
      activeDayTotal: dayTotal,
      daysWithSpendForActiveCat: daysWithSpend,
      dailyPoints: points,
      chartHeight,
      paddingBottom,
      plotHeight,
      plotWidth,
      paddingLeft,
      selectedPoint,
    };
  }, [
    transactions,
    categories,
    currentMonthStart,
    currentMonthEnd,
    selectedCategoryId,
    selectedDay,
    svgWidth,
  ]);

  // Caminho da linha e área SVG
  const linePath = useMemo(() => {
    return createSmoothPath(dailyPoints.map((p) => ({ x: p.x, y: p.y })));
  }, [dailyPoints]);

  const areaPath = useMemo(() => {
    if (dailyPoints.length === 0) return '';
    const first = dailyPoints[0];
    const last = dailyPoints[dailyPoints.length - 1];
    const baseline = chartHeight - paddingBottom;
    return `${linePath} L ${last.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`;
  }, [dailyPoints, linePath, chartHeight, paddingBottom]);

  // Índice da categoria ativa na lista de categorias com gasto
  const activeCategoryIndex = useMemo(() => {
    if (!activeCategory) return 0;
    const idx = categoriesWithSpend.findIndex((c) => c.id === activeCategory.id);
    return idx >= 0 ? idx : 0;
  }, [categoriesWithSpend, activeCategory]);

  // Ao selecionar uma categoria, ajusta o dia para um dia com gastos se o atual estiver zerado
  const handleSelectCategory = useCallback(
    (catId: string, shouldSwitchTab = false) => {
      setSelectedCategoryId(catId);
      setShowDrilldown(true);
      if (shouldSwitchTab) {
        setActiveTab('daily');
      }

      const catDays = categoryDayMap[catId] || {};
      if (!catDays[selectedDay] || catDays[selectedDay] <= 0) {
        let latestDay = 0;
        for (let d = daysInMonth; d >= 1; d--) {
          if ((catDays[d] || 0) > 0) {
            latestDay = d;
            break;
          }
        }
        if (latestDay > 0) {
          setSelectedDay(latestDay);
        }
      }

      // Auto-scroll para centralizar a pílula da categoria selecionada
      const catIdx = categoriesWithSpend.findIndex((c) => c.id === catId);
      if (categoryScrollRef.current && catIdx >= 0) {
        categoryScrollRef.current.scrollTo({
          x: Math.max(0, catIdx * 115 - 40),
          animated: true,
        });
      }
    },
    [categoryDayMap, selectedDay, daysInMonth, categoriesWithSpend]
  );

  const goToNextCategory = useCallback(() => {
    if (categoriesWithSpend.length <= 1) return;
    const nextIdx = (activeCategoryIndex + 1) % categoriesWithSpend.length;
    handleSelectCategory(categoriesWithSpend[nextIdx].id);
  }, [activeCategoryIndex, categoriesWithSpend, handleSelectCategory]);

  const goToPrevCategory = useCallback(() => {
    if (categoriesWithSpend.length <= 1) return;
    const prevIdx =
      (activeCategoryIndex - 1 + categoriesWithSpend.length) % categoriesWithSpend.length;
    handleSelectCategory(categoriesWithSpend[prevIdx].id);
  }, [activeCategoryIndex, categoriesWithSpend, handleSelectCategory]);

  // Gesto de Arraste Horizontal para alternar categorias no card do gráfico
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detecta gesto horizontal intencional
        const isHorizontal =
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.1;
        return isHorizontal;
      },
      onPanResponderGrant: () => {
        onSetScrollEnabled?.(false);
      },
      onPanResponderRelease: (_, gestureState) => {
        onSetScrollEnabled?.(true);
        if (gestureState.dx < -30) {
          goToNextCategory();
        } else if (gestureState.dx > 30) {
          goToPrevCategory();
        }
      },
      onPanResponderTerminate: () => {
        onSetScrollEnabled?.(true);
      },
    });
  }, [goToNextCategory, goToPrevCategory, onSetScrollEnabled]);

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
          <Pressable
            onPress={() => setActiveTab('comparative')}
            style={({ pressed }) => [
              styles.kpiCard,
              {
                backgroundColor: colors.surface,
                borderColor: activeTab === 'comparative' ? colors.primary : colors.borderSubtle,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ver comparativo mensal detalhado"
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
          </Pressable>

          {/* Card 2: Status dos Tetos */}
          <Pressable
            onPress={() => setActiveTab('overview')}
            style={({ pressed }) => [
              styles.kpiCard,
              {
                backgroundColor: colors.surface,
                borderColor:
                  overBudgetCategories.length > 0
                    ? colors.danger
                    : activeTab === 'overview'
                    ? colors.primary
                    : colors.borderSubtle,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ver status de tetos e distribuição"
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
          </Pressable>
        </View>

        {/* Seletor Segmentado de Visualização (Organização em 3 Abas Focadas) */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab('overview')}
            style={[
              styles.segmentBtn,
              activeTab === 'overview' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ],
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'overview' }}
          >
            <PieIcon
              size={13}
              color={activeTab === 'overview' ? (isDark ? colors.primary : colors.text) : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'overview' ? colors.text : colors.textSecondary,
                  fontFamily: activeTab === 'overview' ? Typography.bold : Typography.medium,
                },
              ]}
            >
              Visão Geral
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('daily')}
            style={[
              styles.segmentBtn,
              activeTab === 'daily' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ],
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'daily' }}
          >
            <Activity
              size={13}
              color={activeTab === 'daily' ? (isDark ? colors.primary : colors.text) : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'daily' ? colors.text : colors.textSecondary,
                  fontFamily: activeTab === 'daily' ? Typography.bold : Typography.medium,
                },
              ]}
            >
              Evolução Diária
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('comparative')}
            style={[
              styles.segmentBtn,
              activeTab === 'comparative' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ],
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'comparative' }}
          >
            <BarChart2
              size={13}
              color={activeTab === 'comparative' ? (isDark ? colors.primary : colors.text) : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'comparative' ? colors.text : colors.textSecondary,
                  fontFamily: activeTab === 'comparative' ? Typography.bold : Typography.medium,
                },
              ]}
            >
              Comparativo
            </Text>
          </Pressable>
        </View>

        {/* ABA 1: VISÃO GERAL (Tetos Ultrapassados se houver + Distribuição Donut) */}
        {activeTab === 'overview' && (
          <>
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
                        Tetos ultrapassados
                      </Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                        Categorias que excederam o orçamento estipulado
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.overBudgetList}>
                  {overBudgetCategories.map((item) => (
                    <OverBudgetCategoryCard
                      key={item.category.id}
                      item={item}
                      transactions={transactions}
                      currentMonthStart={currentMonthStart}
                      currentMonthEnd={currentMonthEnd}
                      privacyMode={privacyMode}
                      colors={colors}
                      isDark={isDark}
                      onPressTransaction={onPressTransaction}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Diagnóstico de Saúde Financeira e Ritmo Diário */}
            <FinancialHealthScoreCard noMargin />
            <DailyBurnRateCard noMargin />
          </>
        )}

        {/* ABA 2: EVOLUÇÃO DIÁRIA (Gráfico de Linha por Categoria + Detalhamento em Barras) */}
        {activeTab === 'daily' && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.iconPill,
                  { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)' },
                ]}
              >
                <Activity size={16} color={colors.secondary} />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Evolução diária de gastos
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Acompanhe os gastos dia a dia e toque para detalhar
                </Text>
              </View>
            </View>
          </View>

          {/* Seletor Horizontal de Categorias (Chips) */}
          {categoriesWithSpend.length > 0 ? (
            <>
              <ScrollView
                ref={categoryScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsScroll}
                onTouchStart={() => onSetScrollEnabled?.(false)}
                onTouchEnd={() => onSetScrollEnabled?.(true)}
                onTouchCancel={() => onSetScrollEnabled?.(true)}
                onScrollBeginDrag={() => onSetScrollEnabled?.(false)}
                onScrollEndDrag={() => onSetScrollEnabled?.(true)}
                onMomentumScrollEnd={() => onSetScrollEnabled?.(true)}
              >
                {categoriesWithSpend.map((cat) => {
                  const IconComp = getCategoryIconComponent(cat.icon);
                  const isSelected = activeCategory?.id === cat.id;
                  const catTotal = categoryStats.find((s) => s.category.id === cat.id)?.currentSpent || 0;

                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => handleSelectCategory(cat.id)}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? `${cat.color}28`
                              : `${cat.color}16`
                            : colors.surface,
                          borderColor: isSelected ? cat.color : colors.borderSubtle,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar categoria ${cat.name}`}
                    >
                      <View
                        style={[
                          styles.categoryChipIcon,
                          { backgroundColor: `${cat.color}25` },
                        ]}
                      >
                        <IconComp size={13} color={cat.color} />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.categoryChipName,
                            {
                              color: isSelected ? (isDark ? '#FFFFFF' : '#0F172A') : colors.textSecondary,
                              fontFamily: isSelected ? Typography.bold : Typography.medium,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        <Text
                          style={[
                            styles.categoryChipAmount,
                            { color: isSelected ? cat.color : colors.textMuted },
                          ]}
                        >
                          {privacyMode ? '••••••' : formatBRL(catTotal)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Card do Gráfico de Linha Diário com Suporte a Deslize Lateral */}
              <View
                {...panResponder.panHandlers}
                style={[
                  styles.chartContainerCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    marginTop: 12,
                  },
                ]}
              >
                {/* Cabeçalho do Card com Navegação Rápida de Categorias */}
                <View style={styles.dailyChartCardHeader}>
                  <View style={styles.dailyChartHeaderLeft}>
                    {activeCategory && (
                      <View style={styles.dailyCatBadgeRow}>
                        <Pressable
                          onPress={goToPrevCategory}
                          style={({ pressed }) => [
                            styles.catNavArrowBtn,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                              opacity: pressed ? 0.6 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Categoria anterior"
                        >
                          <ChevronLeft size={14} color={colors.text} />
                        </Pressable>

                        <View
                          style={[
                            styles.dailyCatBadge,
                            { backgroundColor: `${activeCategory.color}20` },
                          ]}
                        >
                          <View
                            style={[
                              styles.legendColorDot,
                              { backgroundColor: activeCategory.color, marginRight: 6 },
                            ]}
                          />
                          <Text
                            style={[styles.dailyCatBadgeText, { color: activeCategory.color }]}
                            numberOfLines={1}
                          >
                            {activeCategory.name}
                          </Text>
                        </View>

                        <Pressable
                          onPress={goToNextCategory}
                          style={({ pressed }) => [
                            styles.catNavArrowBtn,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                              opacity: pressed ? 0.6 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Próxima categoria"
                        >
                          <ChevronRight size={14} color={colors.text} />
                        </Pressable>
                      </View>
                    )}
                    <Text style={[styles.dailyChartHint, { color: colors.textSecondary }]}>
                      Deslize para o lado para trocar de categoria
                    </Text>
                  </View>

                  <View style={styles.dailyChartHeaderRight}>
                    <Text style={[styles.dailyChartSelectedDayLabel, { color: colors.textSecondary }]}>
                      Dia {selectedDay}
                    </Text>
                    <Text style={[styles.dailyChartSelectedDayAmount, { color: colors.text }]}>
                      {privacyMode ? '••••••' : formatBRL(activeDayTotal)}
                    </Text>
                  </View>
                </View>

                {/* SVG Integrado à Largura do Card */}
                <View style={{ alignItems: 'center', marginVertical: 4 }}>
                  <Svg width={svgWidth} height={chartHeight}>
                    <Defs>
                      <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop
                          offset="0%"
                          stopColor={activeCategory?.color || colors.primary}
                          stopOpacity={isDark ? '0.35' : '0.22'}
                        />
                        <Stop
                          offset="100%"
                          stopColor={activeCategory?.color || colors.primary}
                          stopOpacity="0"
                        />
                      </LinearGradient>
                    </Defs>

                    {/* Linhas de Grade Horizontais */}
                    {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const yPos = chartHeight - paddingBottom - ratio * plotHeight;
                      return (
                        <Line
                          key={idx}
                          x1={10}
                          y1={yPos}
                          x2={svgWidth - 10}
                          y2={yPos}
                          stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                          strokeWidth={1}
                          strokeDasharray="4,4"
                        />
                      );
                    })}

                    {/* Preenchimento de Área com Gradiente */}
                    {areaPath ? (
                      <Path d={areaPath} fill="url(#lineGrad)" />
                    ) : null}

                    {/* Linha de Traçado Suave */}
                    {linePath ? (
                      <Path
                        d={linePath}
                        stroke={activeCategory?.color || colors.primary}
                        strokeWidth={2.5}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}

                    {/* Linha Vertical no Dia Selecionado */}
                    {selectedPoint && (
                      <Line
                        x1={selectedPoint.x}
                        y1={12}
                        x2={selectedPoint.x}
                        y2={chartHeight - paddingBottom}
                        stroke={activeCategory?.color || colors.primary}
                        strokeWidth={1.5}
                        strokeDasharray="3,3"
                        opacity={0.8}
                      />
                    )}

                    {/* Pontos nos Dias e Rótulos do Eixo X */}
                    {dailyPoints.map((pt) => {
                      const isSel = pt.day === selectedDay;
                      const hasSpend = pt.amount > 0;
                      const isToday = pt.day === todayDay;
                      const showLabel =
                        isSel ||
                        pt.day === 1 ||
                        pt.day === 5 ||
                        pt.day === 10 ||
                        pt.day === 15 ||
                        pt.day === 20 ||
                        pt.day === 25 ||
                        pt.day === daysInMonth;

                      const colWidth = plotWidth / Math.max(daysInMonth, 1);

                      return (
                        <G key={pt.day}>
                          {/* Ponto de Gasto */}
                          {hasSpend && (
                            <Circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSel ? 6 : 3.5}
                              fill={isSel ? '#FFFFFF' : (activeCategory?.color || colors.primary)}
                              stroke={activeCategory?.color || colors.primary}
                              strokeWidth={isSel ? 2.5 : 1}
                            />
                          )}

                          {/* Se for o dia selecionado sem gasto, marcador sutil na base */}
                          {isSel && !hasSpend && (
                            <Circle
                              cx={pt.x}
                              cy={chartHeight - paddingBottom}
                              r={3.5}
                              fill={activeCategory?.color || colors.primary}
                            />
                          )}

                          {/* Rótulo do Dia no Eixo X */}
                          {showLabel && (
                            <SvgText
                              x={pt.x}
                              y={chartHeight - 10}
                              textAnchor="middle"
                              fontSize={isSel ? '11' : '9'}
                              fontWeight={isSel ? 'bold' : 'normal'}
                              fill={
                                isSel
                                  ? (activeCategory?.color || colors.primary)
                                  : isToday
                                  ? colors.text
                                  : colors.textMuted
                              }
                            >
                              {String(pt.day).padStart(2, '0')}
                            </SvgText>
                          )}

                          {/* Coluna Invisível para Captura de Toque */}
                          <Rect
                            x={pt.x - colWidth / 2}
                            y={0}
                            width={colWidth}
                            height={chartHeight}
                            fill="transparent"
                            onPress={() => {
                              setSelectedDay(pt.day);
                              setShowDrilldown(true);
                            }}
                          />
                        </G>
                      );
                    })}
                  </Svg>
                </View>

                {/* Indicadores de Paginação das Categorias */}
                {categoriesWithSpend.length > 1 && (
                  <View style={styles.catPaginationDots}>
                    {categoriesWithSpend.map((cat, idx) => {
                      const isAct = idx === activeCategoryIndex;
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => handleSelectCategory(cat.id)}
                          style={[
                            styles.catDot,
                            {
                              backgroundColor: isAct
                                ? cat.color
                                : isDark
                                ? 'rgba(255, 255, 255, 0.2)'
                                : 'rgba(0, 0, 0, 0.18)',
                              width: isAct ? 16 : 6,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Ir para categoria ${cat.name}`}
                        />
                      );
                    })}
                  </View>
                )}
              </View>

              {/* DETALHAMENTO EM GRÁFICO DE BARRAS DAS TRANSAÇÕES DO DIA */}
              {showDrilldown && activeCategory && (
                <View
                  style={[
                    styles.drilldownCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                      marginTop: 12,
                    },
                  ]}
                >
                  {/* Cabeçalho do Detalhamento */}
                  <View style={styles.drilldownHeader}>
                    <View style={styles.drilldownHeaderLeft}>
                      <View
                        style={[
                          styles.categoryIconBox,
                          {
                            backgroundColor: `${activeCategory.color}22`,
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                          },
                        ]}
                      >
                        {(() => {
                          const IconComp = getCategoryIconComponent(activeCategory.icon);
                          return <IconComp size={16} color={activeCategory.color} />;
                        })()}
                      </View>
                      <View>
                        <Text style={[styles.drilldownCatTitle, { color: colors.text }]}>
                          {activeCategory.name}
                        </Text>
                        <Text style={[styles.drilldownDaySubtitle, { color: colors.textSecondary }]}>
                          Transações do Dia {String(selectedDay).padStart(2, '0')}
                          {selectedDay === todayDay ? ' (Hoje)' : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Navegador de Dias (< Dia >) e Botão Fechar */}
                    <View style={styles.drilldownControls}>
                      <View style={styles.drilldownDayNav}>
                        <Pressable
                          disabled={selectedDay <= 1}
                          onPress={() => setSelectedDay((prev) => Math.max(1, prev - 1))}
                          style={({ pressed }) => [
                            styles.drilldownNavBtn,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                              opacity: selectedDay <= 1 ? 0.3 : pressed ? 0.6 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Dia anterior"
                        >
                          <ChevronLeft size={16} color={colors.text} />
                        </Pressable>
                        <Pressable
                          disabled={selectedDay >= daysInMonth}
                          onPress={() => setSelectedDay((prev) => Math.min(daysInMonth, prev + 1))}
                          style={({ pressed }) => [
                            styles.drilldownNavBtn,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                              opacity: selectedDay >= daysInMonth ? 0.3 : pressed ? 0.6 : 1,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Próximo dia"
                        >
                          <ChevronRight size={16} color={colors.text} />
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={() => setShowDrilldown(false)}
                        style={({ pressed }) => [
                          styles.drilldownCloseBtn,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Fechar detalhamento de transações"
                      >
                        <X size={15} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Resumo do Dia */}
                  <View style={[styles.drilldownSummaryRow, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.drilldownSummaryLabel, { color: colors.textSecondary }]}>
                      TOTAL DO DIA
                    </Text>
                    <Text style={[styles.drilldownSummaryAmount, { color: activeCategory.color }]}>
                      {privacyMode ? '••••••' : formatBRL(activeDayTotal)}
                    </Text>
                  </View>

                  {/* GRÁFICO DE BARRAS DAS TRANSAÇÕES */}
                  {activeDayTransactions.length > 0 ? (
                    <View style={styles.drilldownBarsList}>
                      {activeDayTransactions.map((tx) => {
                        const { cleanName, installment } = parseMerchantAndInstallments(tx.merchant, tx.rawText);
                        const maxTxAmount = Math.max(...activeDayTransactions.map((t) => t.amount), 1);
                        const widthPct = Math.max(10, Math.round((tx.amount / maxTxAmount) * 100));
                        const pctOfDay = activeDayTotal > 0 ? Math.round((tx.amount / activeDayTotal) * 100) : 100;
                        const timeStr = formatTransactionTime(tx.timestamp);

                        return (
                          <Pressable
                            key={tx.id}
                            onPress={() => onPressTransaction?.(tx)}
                            style={({ pressed }) => [
                              styles.txBarCard,
                              {
                                backgroundColor: pressed
                                  ? isDark
                                    ? 'rgba(255, 255, 255, 0.05)'
                                    : 'rgba(0, 0, 0, 0.04)'
                                  : 'transparent',
                                transform: [{ scale: pressed ? 0.985 : 1 }],
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${cleanName}, ${formatBRL(tx.amount)}, toque para abrir detalhes`}
                          >
                            <View style={styles.txBarMetaRow}>
                              <View style={styles.txBarMerchantInfo}>
                                <Text
                                  style={[styles.txBarMerchantName, { color: colors.text }]}
                                  numberOfLines={1}
                                >
                                  {cleanName}
                                </Text>
                                {installment && (
                                  <View
                                    style={[
                                      styles.installmentTag,
                                      {
                                        backgroundColor: isDark
                                          ? 'rgba(255, 255, 255, 0.08)'
                                          : 'rgba(0, 0, 0, 0.06)',
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.installmentTagText, { color: colors.textSecondary }]}>
                                      {installment.text}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.txBarAmountText,
                                  { color: isDark ? '#F87171' : '#E11D48' },
                                ]}
                              >
                                - {privacyMode ? '••••••' : formatBRL(tx.amount)}
                              </Text>
                            </View>

                            {/* Barra Visual Proporcional */}
                            <AnimatedCompareBar
                              widthPct={widthPct}
                              color={activeCategory.color || colors.primary}
                              barTrackStyle={[
                                styles.txBarTrack,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.06)',
                                },
                              ]}
                              barFillStyle={styles.txBarFill}
                            />

                            <View style={styles.txBarSubRow}>
                              <Text style={[styles.txBarSubText, { color: colors.textMuted }]}>
                                {pctOfDay}% do total do dia
                              </Text>
                              {timeStr ? (
                                <Text style={[styles.txBarSubText, { color: colors.textMuted }]}>
                                  {timeStr}
                                </Text>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.drilldownEmptyBox}>
                      <Text style={[styles.drilldownEmptyTitle, { color: colors.textSecondary }]}>
                        Nenhum gasto em {activeCategory.name} no dia {selectedDay}
                      </Text>

                      {daysWithSpendForActiveCat.length > 0 && (
                        <View style={styles.daysQuickPickContainer}>
                          <Text style={[styles.daysQuickPickTitle, { color: colors.textMuted }]}>
                            Dias com compras nesta categoria:
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.daysQuickPickList}
                          >
                            {daysWithSpendForActiveCat.map((d) => {
                              const daySpent = categoryDayMap[activeCategory.id]?.[d] || 0;
                              return (
                                <Pressable
                                  key={d}
                                  onPress={() => setSelectedDay(d)}
                                  style={({ pressed }) => [
                                    styles.dayQuickPickPill,
                                    {
                                      backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(0, 0, 0, 0.05)',
                                      borderColor: colors.borderSubtle,
                                      opacity: pressed ? 0.7 : 1,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.dayQuickPickDay, { color: colors.text }]}>
                                    Dia {String(d).padStart(2, '0')}
                                  </Text>
                                  <Text
                                    style={[styles.dayQuickPickAmount, { color: activeCategory.color }]}
                                  >
                                    {privacyMode ? '••' : formatBRL(daySpent)}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.chartContainerCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  alignItems: 'center',
                  paddingVertical: 28,
                },
              ]}
            >
              <Activity size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyChartTitle, { color: colors.text, marginTop: 8 }]}>
                Sem despesas no mês
              </Text>
              <Text style={[styles.emptyChartSubtitle, { color: colors.textSecondary }]}>
                A evolução diária por categoria aparecerá automaticamente quando você registrar compras.
              </Text>
            </View>
          )}
        </View>
        )}

        {/* ABA 1 (Continuação): Gráfico Donut de Distribuição de Despesas */}
        {activeTab === 'overview' && (
          <>
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
                    Distribuição de despesas
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
                          <Pressable
                            key={item.category.id}
                            onPress={() => handleSelectCategory(item.category.id, true)}
                            style={({ pressed }) => [
                              styles.legendRow,
                              { opacity: pressed ? 0.7 : 1 },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Ver evolução da categoria ${item.category.name}`}
                          >
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
                          </Pressable>
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

          {/* Diagnóstico Estrutural 50/30/20 & Drenos Silenciosos */}
          <Budget503020Card noMargin />
          <RecurringSubscriptionsCard noMargin />
        </>
        )}

        {/* ABA 3: COMPARATIVO MENSAL */}
        {activeTab === 'comparative' && (
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
                    Comparativo mensal
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
        )}
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
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: 22,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: Radii.md,
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 11.5,
    letterSpacing: -0.2,
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
  txListContainer: {
    marginTop: 14,
  },
  txListDivider: {
    height: 1,
    marginBottom: 12,
  },
  txListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txListHeaderTitle: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  txItemsList: {
    gap: 2,
  },
  txItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  txBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  txMetaTexts: {
    flex: 1,
  },
  txMerchantText: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
  txDateText: {
    fontSize: 11,
    fontFamily: Typography.regular,
    marginTop: 1,
  },
  txItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txAmountText: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    gap: 6,
  },
  expandBtnText: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: 0.2,
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
  categoryChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  categoryChipIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipName: {
    fontSize: 12,
  },
  categoryChipAmount: {
    fontSize: 11,
    fontFamily: Typography.bold,
    marginTop: 1,
  },
  dailyChartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyChartHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  dailyCatBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  catNavArrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPaginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    marginBottom: 2,
  },
  catDot: {
    height: 6,
    borderRadius: 3,
  },
  dailyCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  dailyCatBadgeText: {
    fontSize: 12,
    fontFamily: Typography.bold,
  },
  dailyChartHint: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  dailyChartHeaderRight: {
    alignItems: 'flex-end',
  },
  dailyChartSelectedDayLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  dailyChartSelectedDayAmount: {
    fontSize: 15,
    fontFamily: Typography.bold,
    marginTop: 2,
  },
  drilldownCard: {
    padding: 16,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  drilldownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  drilldownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  drilldownCatTitle: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  drilldownDaySubtitle: {
    fontSize: 11,
    fontFamily: Typography.regular,
    marginTop: 1,
  },
  drilldownControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drilldownDayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drilldownNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drilldownCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drilldownSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  drilldownSummaryLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  drilldownSummaryAmount: {
    fontSize: 15,
    fontFamily: Typography.bold,
  },
  drilldownBarsList: {
    gap: 12,
  },
  txBarCard: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  txBarMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  txBarMerchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  txBarMerchantName: {
    fontSize: 13,
    fontFamily: Typography.medium,
    flexShrink: 1,
  },
  installmentTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  installmentTagText: {
    fontSize: 10,
    fontFamily: Typography.medium,
  },
  txBarAmountText: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  txBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  txBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  txBarSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txBarSubText: {
    fontSize: 10,
    fontFamily: Typography.regular,
  },
  drilldownEmptyBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  drilldownEmptyTitle: {
    fontSize: 12,
    fontFamily: Typography.medium,
    textAlign: 'center',
  },
  daysQuickPickContainer: {
    marginTop: 12,
    width: '100%',
  },
  daysQuickPickTitle: {
    fontSize: 11,
    fontFamily: Typography.medium,
    marginBottom: 8,
  },
  daysQuickPickList: {
    gap: 8,
  },
  dayQuickPickPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayQuickPickDay: {
    fontSize: 11,
    fontFamily: Typography.bold,
  },
  dayQuickPickAmount: {
    fontSize: 10,
    fontFamily: Typography.medium,
    marginTop: 2,
  },
});
