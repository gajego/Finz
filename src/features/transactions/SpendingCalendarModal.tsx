import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  X,
  TrendingDown,
  Activity,
  Flame,
  Receipt,
  CalendarDays,
  ArrowLeft,
  EyeOff,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, Radii } from '@/theme/typography';
import { Transaction, Category } from '@/types';
import { TransactionItem } from './TransactionItem';
import {
  formatBRL,
  getBrazilDateParts,
} from './transactionUtils';
import { useSwipeModalDismiss, ModalTopHandle } from '@/components/ui/SwipeableModalSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// Em telas web largas, o calendário ocupa uma coluna lateral; em telas estreitas ou mobile, bottom-sheet.
const WEB_PANEL_WIDTH = Math.min(SCREEN_WIDTH, 560);

interface SpendingCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTransaction?: (transaction: Transaction) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEKDAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const WEEKDAY_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

// Dimensão dos cubos do calendário — maior em telas largas
const CALENDAR_PADDING = 16;
const CUBE_GAP = 5;
const CALENDAR_INNER = (IS_WEB ? WEB_PANEL_WIDTH : SCREEN_WIDTH) - CALENDAR_PADDING * 2 - 32;
const CUBE_SIZE = Math.floor((CALENDAR_INNER - CUBE_GAP * 6) / 7);

// ─────────────────────────── Conteúdo do Calendário ───────────────────────────
function CalendarContent({
  onClose,
  onSelectTransaction,
}: {
  onClose: () => void;
  onSelectTransaction?: (tx: Transaction) => void;
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);
  const presentationMode = useWalletStore((s) => s.presentationMode);

  // Mapeamento de categorias consideradas em totais (considerar !== false e type !== 'income')
  const isTxConsidered = useMemo(() => {
    const catMap = new Map<string, Category>();
    for (const c of categories) {
      catMap.set(c.id, c);
    }
    return (tx: Transaction): boolean => {
      if (!tx.categoryId) return true;
      const cat = catMap.get(tx.categoryId);
      if (!cat) return true;
      return cat.considerar !== false && cat.type !== 'income';
    };
  }, [categories]);

  const nowParts = useMemo(() => getBrazilDateParts(Date.now()), []);

  const [selectedYear, setSelectedYear] = useState(nowParts.year);
  const [selectedMonth, setSelectedMonth] = useState(nowParts.month);
  const [selectedDay, setSelectedDay] = useState(nowParts.day);

  const isCurrentMonth = selectedYear === nowParts.year && selectedMonth === nowParts.month;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
    setSelectedDay(1);
  };

  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth + 1, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  const startDayOfWeek = useMemo(
    () => new Date(selectedYear, selectedMonth, 1).getDay(),
    [selectedYear, selectedMonth]
  );

  const { dayStats, monthTotalSpent, peakDay, totalTxCount } = useMemo(() => {
    const stats: { [d: number]: { totalSpent: number; txCount: number; transactions: Transaction[] } } = {};
    for (let d = 1; d <= daysInMonth; d++) stats[d] = { totalSpent: 0, txCount: 0, transactions: [] };

    let monthTotal = 0, totalCount = 0;

    for (const tx of transactions) {
      const p = getBrazilDateParts(tx.timestamp);
      if (p.year !== selectedYear || p.month !== selectedMonth) continue;
      const d = p.day;
      if (!stats[d]) stats[d] = { totalSpent: 0, txCount: 0, transactions: [] };
      stats[d].transactions.push(tx);

      // Apenas computa nos totais se a categoria não estiver desconsiderada
      if (isTxConsidered(tx)) {
        if (tx.type === 'EXPENSE' || tx.type === 'PIX_OUT') {
          stats[d].totalSpent += tx.amount;
          stats[d].txCount++;
          monthTotal += tx.amount;
          totalCount++;
        } else if (tx.type === 'REFUND') {
          stats[d].totalSpent = Math.max(0, stats[d].totalSpent - tx.amount);
          monthTotal = Math.max(0, monthTotal - tx.amount);
        }
      }
    }

    for (let d = 1; d <= daysInMonth; d++)
      stats[d].transactions.sort((a, b) => b.timestamp - a.timestamp);

    let maxSpent = 0, maxDay = 0;
    for (let d = 1; d <= daysInMonth; d++)
      if (stats[d].totalSpent > maxSpent) { maxSpent = stats[d].totalSpent; maxDay = d; }

    return {
      dayStats: stats,
      monthTotalSpent: monthTotal,
      peakDay: maxDay > 0 ? { day: maxDay, amount: maxSpent } : null,
      totalTxCount: totalCount,
    };
  }, [transactions, selectedYear, selectedMonth, daysInMonth, isTxConsidered]);

  const dailyAverage = useMemo(() => {
    const days = isCurrentMonth ? Math.max(1, Math.min(nowParts.day, daysInMonth)) : daysInMonth;
    return Math.round(monthTotalSpent / days);
  }, [monthTotalSpent, isCurrentMonth, nowParts.day, daysInMonth]);

  const selectedDayData = dayStats[selectedDay] || { totalSpent: 0, txCount: 0, transactions: [] };
  const selectedDayOfWeekIndex = useMemo(
    () => new Date(selectedYear, selectedMonth, selectedDay).getDay(),
    [selectedYear, selectedMonth, selectedDay]
  );
  const isSelectedToday = isCurrentMonth && selectedDay === nowParts.day;

  // Escala de calor por cubo
  const getHeatLevel = (spent: number): 0 | 1 | 2 | 3 => {
    if (spent === 0) return 0;
    if (dailyAverage > 0 && spent > dailyAverage * 1.6) return 3;
    if (dailyAverage > 0 && spent > dailyAverage * 0.8) return 2;
    return 1;
  };

  const HEAT_COLORS = {
    0: 'transparent',
    1: `${colors.primary}26`,  // Leve — tint ácido fraco
    2: 'rgba(245,158,11,0.22)', // Moderado — âmbar
    3: 'rgba(239,68,68,0.22)',  // Alto — vermelho
  };

  const HEAT_BORDER = {
    0: colors.borderSubtle,
    1: `${colors.primary}50`,
    2: 'rgba(245,158,11,0.5)',
    3: 'rgba(239,68,68,0.5)',
  };

  const HEAT_TEXT = {
    0: colors.textMuted,
    1: colors.primary,
    2: '#F59E0B',
    3: '#EF4444',
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Navegação de Mês ── */}
      <View style={styles.monthNavRow}>
        <Pressable
          onPress={handlePrevMonth}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              opacity: pressed ? 0.65 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>

        <View style={styles.monthCenterBlock}>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {MONTH_NAMES[selectedMonth]}
          </Text>
          <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
            {selectedYear}
          </Text>
        </View>

        <Pressable
          onPress={handleNextMonth}
          style={({ pressed }) => [
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              opacity: pressed ? 0.65 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
        >
          <ChevronRight size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Pill "Hoje" apenas quando não está no mês atual */}
      {!isCurrentMonth && (
        <Pressable
          onPress={() => {
            const p = getBrazilDateParts(Date.now());
            setSelectedYear(p.year);
            setSelectedMonth(p.month);
            setSelectedDay(p.day);
          }}
          style={[
            styles.todayPill,
            { borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}12` },
          ]}
        >
          <CalendarDays size={12} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.todayPillText, { color: colors.primary }]}>
            Voltar para Hoje
          </Text>
        </Pressable>
      )}

      {/* ── Métricas ── */}
      <View style={styles.metricsRow}>
        {/* Total */}
        <View style={[styles.metricBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.metricTop}>
            <TrendingDown size={13} color="#EF4444" strokeWidth={2} />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>TOTAL</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
            {formatBRL(monthTotalSpent, presentationMode)}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {totalTxCount} {totalTxCount === 1 ? 'gasto' : 'gastos'}
          </Text>
        </View>

        {/* Média */}
        <View style={[styles.metricBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.metricTop}>
            <Activity size={13} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>MÉDIA/DIA</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
            {formatBRL(dailyAverage, presentationMode)}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {isCurrentMonth ? `${nowParts.day} dias` : 'no mês'}
          </Text>
        </View>

        {/* Pico */}
        {peakDay ? (
          <View style={[styles.metricBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <View style={styles.metricTop}>
              <Flame size={13} color="#F59E0B" strokeWidth={2} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>PICO</Text>
            </View>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]} numberOfLines={1}>
              {formatBRL(peakDay.amount, presentationMode)}
            </Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>
              dia {peakDay.day}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Grade de Dias da Semana ── */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_NAMES.map((name, i) => (
          <View key={name} style={[styles.weekdayCell, { width: CUBE_SIZE }]}>
            <Text
              style={[
                styles.weekdayText,
                { color: i === 0 || i === 6 ? colors.textMuted : colors.textSecondary },
              ]}
            >
              {name}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Grid de Cubos ── */}
      <View style={styles.cubeGrid}>
        {/* Slots vazios antes do dia 1 */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <View key={`e${i}`} style={[styles.cubeEmpty, { width: CUBE_SIZE, height: CUBE_SIZE }]} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const stats = dayStats[day];
          const spent = stats?.totalSpent || 0;
          const heat = getHeatLevel(spent);
          const isSelected = selectedDay === day;
          const isToday = isCurrentMonth && day === nowParts.day;

          const cubeValue = !presentationMode && spent > 0
            ? Math.round(spent / 100) >= 1000
              ? `${(spent / 100000).toFixed(1)}k`
              : `${Math.round(spent / 100)}`
            : spent > 0 && presentationMode ? '•' : '';

          return (
            <Pressable
              key={`d${day}`}
              onPress={() => setSelectedDay(day)}
              style={({ pressed }) => {
                const bg = isSelected
                  ? colors.primary
                  : HEAT_COLORS[heat];
                const border = isSelected
                  ? colors.primary
                  : isToday
                  ? colors.primary
                  : HEAT_BORDER[heat];
                return [
                  styles.cube,
                  {
                    width: CUBE_SIZE,
                    height: CUBE_SIZE,
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: isToday && !isSelected ? 2 : 1,
                    // Sombra de cubo quando tem gasto
                    shadowColor: isSelected
                      ? colors.primary
                      : heat >= 2
                      ? HEAT_TEXT[heat]
                      : '#000',
                    shadowOpacity: isSelected ? 0.5 : heat > 0 ? 0.18 : 0.08,
                    shadowRadius: isSelected ? 6 : 3,
                    shadowOffset: { width: 0, height: isSelected ? 3 : 2 },
                    elevation: isSelected ? 6 : heat > 0 ? 2 : 0,
                    opacity: pressed ? 0.75 : 1,
                  },
                ];
              }}
              accessibilityRole="button"
              accessibilityLabel={`Dia ${day}, gasto ${formatBRL(spent)}`}
            >
              {/* Número do dia */}
              <Text
                style={[
                  styles.cubeDay,
                  {
                    color: isSelected
                      ? colors.primaryForeground
                      : isToday
                      ? colors.primary
                      : heat > 0
                      ? HEAT_TEXT[heat]
                      : colors.textSecondary,
                    fontFamily: isSelected || isToday ? Typography.bold : Typography.medium,
                    fontSize: CUBE_SIZE >= 40 ? 14 : 11,
                  },
                ]}
              >
                {day}
              </Text>

              {/* Valor monetário embaixo */}
              {cubeValue !== '' && (
                <Text
                  style={[
                    styles.cubeValue,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : HEAT_TEXT[heat],
                      fontSize: CUBE_SIZE >= 40 ? 9 : 7,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cubeValue}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Legenda ── */}
      <View style={[styles.legendRow, { borderColor: colors.borderSubtle }]}>
        {([
          { label: 'Leve', color: colors.primary },
          { label: 'Moderado', color: '#F59E0B' },
          { label: 'Elevado', color: '#EF4444' },
        ] as const).map(({ label, color }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendSquare, { backgroundColor: `${color}40`, borderColor: `${color}80` }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Detalhe do Dia Selecionado ── */}
      <View style={[styles.dayDetailCard, { borderColor: colors.borderSubtle }]}>
        <View style={styles.dayDetailHeader}>
          <View>
            <View style={styles.dayDetailTitleRow}>
              <Text style={[styles.dayDetailTitle, { color: colors.text }]}>
                {selectedDay} de {MONTH_NAMES[selectedMonth]}
              </Text>
              {isSelectedToday && (
                <View style={[styles.todayBadge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}50` }]}>
                  <Text style={[styles.todayBadgeText, { color: colors.primary }]}>HOJE</Text>
                </View>
              )}
            </View>
            <Text style={[styles.dayDetailWeekday, { color: colors.textSecondary }]}>
              {WEEKDAY_FULL[selectedDayOfWeekIndex]}
            </Text>
          </View>

          <View style={styles.dayDetailAmountBlock}>
            <Text style={[styles.dayDetailAmountLabel, { color: colors.textSecondary }]}>
              Gasto
            </Text>
            <Text
              style={[
                styles.dayDetailAmount,
                { color: selectedDayData.totalSpent > 0 ? '#EF4444' : colors.textMuted },
              ]}
            >
              {formatBRL(selectedDayData.totalSpent, presentationMode)}
            </Text>
          </View>
        </View>

        {selectedDayData.transactions.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <Receipt size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.emptyDayTitle, { color: colors.text }]}>
              Sem movimentações
            </Text>
            <Text style={[styles.emptyDaySub, { color: colors.textSecondary }]}>
              Nenhuma compra registrada em {selectedDay} de {MONTH_NAMES[selectedMonth]}.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {selectedDayData.transactions.map((tx) => {
              const considered = isTxConsidered(tx);
              return (
                <View key={tx.id} style={styles.txItemWrapper}>
                  <TransactionItem transaction={tx} onPress={onSelectTransaction} />
                  {!considered && (
                    <View
                      style={[
                        styles.ignoredBadge,
                        {
                          backgroundColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <EyeOff size={10} color={colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.ignoredBadgeText, { color: colors.textMuted }]}>
                        Não considerada nos totais
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────── Componente Principal ───────────────────────────
export const SpendingCalendarModal: React.FC<SpendingCalendarModalProps> = ({
  visible,
  onClose,
  onSelectTransaction,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const { handlePanResponder, headerPanResponder, animatedSheetStyle } =
    useSwipeModalDismiss({ onClose, visible });

  if (!visible) return null;

  // ── Versão Web: painel flutuante sem Modal nativo ──
  if (IS_WEB) {
    return (
      <View style={styles.webOverlay}>
        <Pressable style={styles.webBackdrop} onPress={onClose} />
        <View
          style={[
            styles.webPanel,
            {
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderColor: colors.borderSubtle,
              width: WEB_PANEL_WIDTH,
            },
          ]}
        >
          {/* Header web */}
          <View style={[styles.webHeader, { borderColor: colors.borderSubtle }]}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.webBackBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Fechar calendário"
            >
              <ArrowLeft size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>

            <View>
              <Text style={[styles.headerPreTitle, { color: colors.primary }]}>
                CONTROLE MENSAL
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Calendário de Gastos
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <CalendarContent onClose={onClose} onSelectTransaction={onSelectTransaction} />
        </View>
      </View>
    );
  }

  // ── Versão Mobile: bottom-sheet ──
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderColor: colors.borderSubtle,
            },
            animatedSheetStyle,
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <ModalTopHandle
              panHandlers={handlePanResponder.panHandlers}
              color={colors.borderStrong}
            />

            {/* Header mobile */}
            <View {...headerPanResponder.panHandlers} style={styles.mobileHeader}>
              <View>
                <Text style={[styles.headerPreTitle, { color: colors.primary }]}>
                  CONTROLE MENSAL
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Calendário de Gastos
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Fechar calendário"
              >
                <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
              </Pressable>
            </View>

            <CalendarContent onClose={onClose} onSelectTransaction={onSelectTransaction} />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // ── Overlay / sheet ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '95%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 24,
  },

  // ── Web ──
  webOverlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 9999,
  },
  webBackdrop: {
    flex: 1,
  },
  webPanel: {
    height: '100%',
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
    overflow: 'hidden',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  webBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Headers compartilhados ──
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerPreTitle: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.bold,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll content ──
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 4,
  },

  // ── Navegação de mês ──
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenterBlock: {
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 20,
    fontFamily: Typography.bold,
    letterSpacing: -0.4,
  },
  yearLabel: {
    fontSize: 13,
    fontFamily: Typography.regular,
    marginTop: 1,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginBottom: 14,
  },
  todayPillText: {
    fontSize: 11,
    fontFamily: Typography.bold,
  },

  // ── Métricas ──
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    padding: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: Typography.bold,
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 15,
    fontFamily: Typography.bold,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: Typography.regular,
  },

  // ── Dias da semana ──
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayCell: {
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 9,
    fontFamily: Typography.bold,
    letterSpacing: 0.5,
  },

  // ── Grade de cubos ──
  cubeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CUBE_GAP,
    marginBottom: 14,
  },
  cubeEmpty: {
    // espaço vazio alinhado à grade
  },
  cube: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  cubeDay: {
    lineHeight: 17,
  },
  cubeValue: {
    fontFamily: Typography.bold,
    lineHeight: 11,
    letterSpacing: 0.1,
  },

  // ── Legenda ──
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 10,
    marginBottom: 20,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10,
    fontFamily: Typography.medium,
  },

  // ── Detalhe do dia ──
  dayDetailCard: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dayDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDetailTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    letterSpacing: -0.3,
  },
  todayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  todayBadgeText: {
    fontSize: 9,
    fontFamily: Typography.bold,
    letterSpacing: 0.4,
  },
  dayDetailWeekday: {
    fontSize: 12,
    fontFamily: Typography.regular,
    marginTop: 2,
  },
  dayDetailAmountBlock: {
    alignItems: 'flex-end',
  },
  dayDetailAmountLabel: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  dayDetailAmount: {
    fontSize: 17,
    fontFamily: Typography.bold,
    marginTop: 2,
  },

  // ── Empty state ──
  emptyDay: {
    padding: 24,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyDayTitle: {
    fontSize: 14,
    fontFamily: Typography.bold,
    marginBottom: 4,
  },
  emptyDaySub: {
    fontSize: 12,
    fontFamily: Typography.regular,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },

  // ── Lista de transações ──
  txList: {
    gap: 6,
  },
  txItemWrapper: {
    gap: 4,
  },
  ignoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginLeft: 58,
    marginTop: -2,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  ignoredBadgeText: {
    fontSize: 10,
    fontFamily: Typography.regular,
  },
});
