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
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingDown,
  Activity,
  Award,
  Receipt,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, Radii } from '@/theme/typography';
import { Transaction } from '@/types';
import { TransactionItem } from './TransactionItem';
import {
  formatBRL,
  getBrazilDateParts,
} from './transactionUtils';
import { useSwipeModalDismiss, ModalTopHandle } from '@/components/ui/SwipeableModalSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SpendingCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTransaction?: (transaction: Transaction) => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const WEEKDAY_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const SpendingCalendarModal: React.FC<SpendingCalendarModalProps> = ({
  visible,
  onClose,
  onSelectTransaction,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);
  const presentationMode = useWalletStore((s) => s.presentationMode);

  // Data atual no Horário de Brasília
  const nowParts = useMemo(() => getBrazilDateParts(Date.now()), []);

  // Ano e Mês selecionados para visualização do calendário
  const [selectedYear, setSelectedYear] = useState<number>(nowParts.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(nowParts.month); // 0-11
  const [selectedDay, setSelectedDay] = useState<number>(nowParts.day);

  // Ao abrir o modal, redefine para o mês e dia atuais
  useEffect(() => {
    if (visible) {
      const parts = getBrazilDateParts(Date.now());
      setSelectedYear(parts.year);
      setSelectedMonth(parts.month);
      setSelectedDay(parts.day);
    }
  }, [visible]);

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  const isCurrentMonth =
    selectedYear === nowParts.year && selectedMonth === nowParts.month;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  const handleJumpToToday = () => {
    const parts = getBrazilDateParts(Date.now());
    setSelectedYear(parts.year);
    setSelectedMonth(parts.month);
    setSelectedDay(parts.day);
  };

  // Cálculo dos dias no mês e do dia da semana do primeiro dia
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const startDayOfWeek = useMemo(() => {
    // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  // Agrupamento de gastos por dia do mês selecionado
  const {
    dayStats,
    monthTotalSpent,
    peakDay,
    totalTxCount,
  } = useMemo(() => {
    const stats: {
      [day: number]: {
        totalSpent: number;
        txCount: number;
        transactions: Transaction[];
      };
    } = {};

    for (let d = 1; d <= daysInMonth; d++) {
      stats[d] = { totalSpent: 0, txCount: 0, transactions: [] };
    }

    let monthTotal = 0;
    let totalCount = 0;

    for (const tx of transactions) {
      const tParts = getBrazilDateParts(tx.timestamp);
      if (tParts.year === selectedYear && tParts.month === selectedMonth) {
        const d = tParts.day;
        if (!stats[d]) {
          stats[d] = { totalSpent: 0, txCount: 0, transactions: [] };
        }

        stats[d].transactions.push(tx);

        if (tx.type === 'EXPENSE' || tx.type === 'PIX_OUT') {
          stats[d].totalSpent += tx.amount;
          stats[d].txCount += 1;
          monthTotal += tx.amount;
          totalCount += 1;
        } else if (tx.type === 'REFUND') {
          stats[d].totalSpent = Math.max(0, stats[d].totalSpent - tx.amount);
          monthTotal = Math.max(0, monthTotal - tx.amount);
        }
      }
    }

    // Ordena as transações de cada dia por timestamp decrescente
    for (let d = 1; d <= daysInMonth; d++) {
      stats[d].transactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Localiza o dia com maior gasto
    let maxSpent = 0;
    let maxDay = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (stats[d].totalSpent > maxSpent) {
        maxSpent = stats[d].totalSpent;
        maxDay = d;
      }
    }

    return {
      dayStats: stats,
      monthTotalSpent: monthTotal,
      peakDay: maxDay > 0 ? { day: maxDay, amount: maxSpent } : null,
      totalTxCount: totalCount,
    };
  }, [transactions, selectedYear, selectedMonth, daysInMonth]);

  // Média diária calculada (se for o mês atual, divide pelos dias transcorridos)
  const dailyAverage = useMemo(() => {
    const daysToDivide = isCurrentMonth
      ? Math.max(1, Math.min(nowParts.day, daysInMonth))
      : daysInMonth;
    return Math.round(monthTotalSpent / daysToDivide);
  }, [monthTotalSpent, isCurrentMonth, nowParts.day, daysInMonth]);

  // Transações do dia selecionado
  const selectedDayData = dayStats[selectedDay] || {
    totalSpent: 0,
    txCount: 0,
    transactions: [],
  };

  const selectedDayOfWeekIndex = useMemo(() => {
    return new Date(selectedYear, selectedMonth, selectedDay).getDay();
  }, [selectedYear, selectedMonth, selectedDay]);

  const isSelectedToday =
    isCurrentMonth && selectedDay === nowParts.day;

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
            styles.modalSheet,
            {
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
              borderColor: colors.borderSubtle,
            },
            animatedSheetStyle,
          ]}
        >
          <SafeAreaView style={styles.sheetSafeContent}>
            {/* Alça Superior para Gesto de Deslizar e Fechar */}
            <ModalTopHandle
              panHandlers={handlePanResponder.panHandlers}
              color={colors.borderStrong}
            />

            {/* Cabeçalho */}
            <View {...headerPanResponder.panHandlers} style={styles.headerRow}>
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
                  styles.closeButton,
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Barra de Navegação de Mês */}
              <View
                style={[
                  styles.monthNavCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Pressable
                  onPress={handlePrevMonth}
                  style={({ pressed }) => [
                    styles.navArrowBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Mês anterior"
                >
                  <ChevronLeft size={20} color={colors.text} strokeWidth={2.2} />
                </Pressable>

                <View style={styles.monthCenterInfo}>
                  <Text style={[styles.monthTitleText, { color: colors.text }]}>
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </Text>
                  {!isCurrentMonth && (
                    <Pressable
                      onPress={handleJumpToToday}
                      style={[
                        styles.todayPill,
                        {
                          backgroundColor: `${colors.primary}18`,
                          borderColor: `${colors.primary}40`,
                        },
                      ]}
                    >
                      <Sparkles size={11} color={colors.primary} strokeWidth={2.2} />
                      <Text style={[styles.todayPillText, { color: colors.primary }]}>
                        Voltar para Hoje
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Pressable
                  onPress={handleNextMonth}
                  style={({ pressed }) => [
                    styles.navArrowBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Próximo mês"
                >
                  <ChevronRight size={20} color={colors.text} strokeWidth={2.2} />
                </Pressable>
              </View>

              {/* Cards de Métricas Resumo do Mês */}
              <View style={styles.metricsGrid}>
                {/* Total Gasto no Mês */}
                <View
                  style={[
                    styles.metricCard,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.metricIconRow}>
                    <TrendingDown size={14} color="#EF4444" strokeWidth={2.2} />
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      TOTAL DO MÊS
                    </Text>
                  </View>
                  <Text
                    style={[styles.metricValue, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {formatBRL(monthTotalSpent, presentationMode)}
                  </Text>
                  <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                    {totalTxCount} {totalTxCount === 1 ? 'gasto registrado' : 'gastos registrados'}
                  </Text>
                </View>

                {/* Média Diária */}
                <View
                  style={[
                    styles.metricCard,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.metricIconRow}>
                    <Activity size={14} color={colors.primary} strokeWidth={2.2} />
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                      MÉDIA DIÁRIA
                    </Text>
                  </View>
                  <Text
                    style={[styles.metricValue, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {formatBRL(dailyAverage, presentationMode)}
                  </Text>
                  <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                    {isCurrentMonth ? `nos ${nowParts.day} dias transcorridos` : 'ao longo do mês'}
                  </Text>
                </View>

                {/* Maior Gasto em 1 Dia */}
                {peakDay && (
                  <View
                    style={[
                      styles.metricCardWide,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.metricIconRow}>
                      <Award size={14} color="#F59E0B" strokeWidth={2.2} />
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                        PICO DE CONSUMO
                      </Text>
                    </View>
                    <View style={styles.peakContentRow}>
                      <Text style={[styles.peakDayText, { color: colors.text }]}>
                        Dia {peakDay.day} de {MONTH_NAMES[selectedMonth]}
                      </Text>
                      <Text style={[styles.peakAmountText, { color: '#F59E0B' }]}>
                        {formatBRL(peakDay.amount, presentationMode)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Grid do Calendário */}
              <View
                style={[
                  styles.calendarContainer,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                {/* Linha dos Dias da Semana */}
                <View style={styles.weekdayRow}>
                  {WEEKDAY_NAMES.map((name, i) => (
                    <View key={name} style={styles.weekdayCell}>
                      <Text
                        style={[
                          styles.weekdayText,
                          {
                            color: i === 0 || i === 6 ? colors.textMuted : colors.textSecondary,
                          },
                        ]}
                      >
                        {name}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Grade de Dias */}
                <View style={styles.daysGrid}>
                  {/* Slots vazios do início da semana */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                  ))}

                  {/* Dias do Mês */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const stats = dayStats[day];
                    const spent = stats?.totalSpent || 0;
                    const isSelected = selectedDay === day;
                    const isToday = isCurrentMonth && day === nowParts.day;

                    // Intensidade do gasto
                    let heatColor = colors.textMuted;
                    let hasSpending = spent > 0;
                    if (hasSpending) {
                      if (dailyAverage > 0 && spent > dailyAverage * 1.6) {
                        heatColor = '#EF4444'; // Alto gasto (Vermelho)
                      } else if (dailyAverage > 0 && spent > dailyAverage * 0.8) {
                        heatColor = '#F59E0B'; // Gasto moderado (Âmbar)
                      } else {
                        heatColor = colors.primary; // Gasto leve (Verde/Marca)
                      }
                    }

                    return (
                      <Pressable
                        key={`day-${day}`}
                        onPress={() => setSelectedDay(day)}
                        style={({ pressed }) => [
                          styles.dayCell,
                          isSelected && [
                            styles.dayCellSelected,
                            {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            },
                          ],
                          isToday &&
                            !isSelected && [
                              styles.dayCellToday,
                              { borderColor: colors.primary },
                            ],
                          pressed && { opacity: 0.8 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Dia ${day}, gasto de ${formatBRL(spent)}`}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            {
                              color: isSelected
                                ? colors.primaryForeground
                                : isToday
                                ? colors.primary
                                : colors.text,
                              fontFamily:
                                isSelected || isToday
                                  ? Typography.bold
                                  : Typography.medium,
                            },
                          ]}
                        >
                          {day}
                        </Text>

                        {/* Indicador de Gasto */}
                        {hasSpending ? (
                          <View style={styles.dayIndicatorWrapper}>
                            <View
                              style={[
                                styles.spendDot,
                                {
                                  backgroundColor: isSelected
                                    ? colors.primaryForeground
                                    : heatColor,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.daySpendMiniText,
                                {
                                  color: isSelected
                                    ? colors.primaryForeground
                                    : heatColor,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {presentationMode
                                ? '•••'
                                : Math.round(spent / 100) >= 1000
                                ? `${(spent / 100000).toFixed(1)}k`
                                : `${Math.round(spent / 100)}`}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.dayEmptyPlaceholder} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Legenda de Cores */}
                <View style={[styles.legendRow, { borderColor: colors.borderSubtle }]}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>
                      Leve
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>
                      Moderado
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>
                      Acima da média
                    </Text>
                  </View>
                </View>
              </View>

              {/* Seção de Detalhes do Dia Selecionado */}
              <View style={styles.dayDetailSection}>
                <View style={styles.dayDetailHeader}>
                  <View>
                    <View style={styles.dayDetailBadgeRow}>
                      <Text style={[styles.dayDetailDateTitle, { color: colors.text }]}>
                        {selectedDay} de {MONTH_NAMES[selectedMonth]}
                      </Text>
                      {isSelectedToday && (
                        <View
                          style={[
                            styles.todayBadge,
                            {
                              backgroundColor: `${colors.primary}20`,
                              borderColor: `${colors.primary}40`,
                            },
                          ]}
                        >
                          <Text style={[styles.todayBadgeText, { color: colors.primary }]}>
                            HOJE
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.dayDetailWeekday, { color: colors.textSecondary }]}>
                      {WEEKDAY_FULL[selectedDayOfWeekIndex]}
                    </Text>
                  </View>

                  <View style={styles.dayDetailTotalBox}>
                    <Text style={[styles.dayDetailTotalLabel, { color: colors.textSecondary }]}>
                      Gasto no dia
                    </Text>
                    <Text
                      style={[
                        styles.dayDetailTotalAmount,
                        {
                          color: selectedDayData.totalSpent > 0 ? '#EF4444' : colors.textMuted,
                        },
                      ]}
                    >
                      {formatBRL(selectedDayData.totalSpent, presentationMode)}
                    </Text>
                  </View>
                </View>

                {/* Lista de Transações do Dia Selecionado */}
                {selectedDayData.transactions.length === 0 ? (
                  <View
                    style={[
                      styles.dayEmptyState,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyIconBox,
                        {
                          backgroundColor: `${colors.primary}15`,
                          borderColor: `${colors.primary}30`,
                        },
                      ]}
                    >
                      <Receipt size={22} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.emptyDayTitle, { color: colors.text }]}>
                      Nenhum gasto neste dia
                    </Text>
                    <Text style={[styles.emptyDaySubtitle, { color: colors.textSecondary }]}>
                      Nenhuma compra ou movimentação foi registrada em {selectedDay} de{' '}
                      {MONTH_NAMES[selectedMonth]}.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.transactionsList}>
                    {selectedDayData.transactions.map((tx) => (
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        onPress={onSelectTransaction}
                      />
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 24,
  },
  sheetSafeContent: {
    flex: 1,
  },
  headerRow: {
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenterInfo: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 17,
    fontFamily: Typography.bold,
    letterSpacing: -0.3,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginTop: 4,
  },
  todayPillText: {
    fontSize: 10,
    fontFamily: Typography.bold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 50) / 2,
    padding: 14,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  metricCardWide: {
    width: '100%',
    padding: 14,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 18,
    fontFamily: Typography.bold,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  peakContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  peakDayText: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
  peakAmountText: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  calendarContainer: {
    padding: 14,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginBottom: 20,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.6,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    height: 52,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 4,
  },
  dayCellSelected: {
    borderRadius: 12,
  },
  dayCellToday: {
    borderWidth: 1.5,
  },
  dayNumberText: {
    fontSize: 13,
    lineHeight: 16,
  },
  dayIndicatorWrapper: {
    alignItems: 'center',
    marginTop: 2,
  },
  spendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 1,
  },
  daySpendMiniText: {
    fontSize: 9,
    fontFamily: Typography.bold,
    lineHeight: 11,
  },
  dayEmptyPlaceholder: {
    height: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontFamily: Typography.medium,
  },
  dayDetailSection: {
    marginTop: 4,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dayDetailBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDetailDateTitle: {
    fontSize: 16,
    fontFamily: Typography.bold,
    letterSpacing: -0.3,
  },
  todayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  todayBadgeText: {
    fontSize: 9,
    fontFamily: Typography.bold,
  },
  dayDetailWeekday: {
    fontSize: 12,
    fontFamily: Typography.regular,
    marginTop: 2,
  },
  dayDetailTotalBox: {
    alignItems: 'flex-end',
  },
  dayDetailTotalLabel: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  dayDetailTotalAmount: {
    fontSize: 16,
    fontFamily: Typography.bold,
    marginTop: 1,
  },
  dayEmptyState: {
    padding: 24,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyDayTitle: {
    fontSize: 15,
    fontFamily: Typography.bold,
    marginBottom: 4,
  },
  emptyDaySubtitle: {
    fontSize: 12,
    fontFamily: Typography.regular,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  transactionsList: {
    gap: 6,
  },
});
