import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Sliders,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Layers,
  Sparkles,
  EyeOff,
} from 'lucide-react-native';
import { Category } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { getCategoryIconComponent } from './categoryIcons';
import { CategoryModal } from './CategoryModal';

const AnimatedGoalBar: React.FC<{
  percent: number;
  color: string;
  trackStyle: any;
  barStyle: any;
}> = ({ percent, color, trackStyle, barStyle }) => {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(Math.min(percent, 100), {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={trackStyle}>
      <Animated.View style={[barStyle, { backgroundColor: color }, animStyle]} />
    </View>
  );
};

export const GoalsScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategoryToEdit, setSelectedCategoryToEdit] = useState<Category | null>(null);

  // Mês atual
  const currentMonthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const currentMonthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  }, []);

  const currentMonthName = useMemo(() => {
    const d = new Date();
    const name = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  // Gasto por categoria
  const getCategorySpent = (categoryId: string) => {
    return transactions
      .filter((t) => {
        if (t.categoryId !== categoryId || t.type !== 'EXPENSE') return false;
        return t.timestamp >= currentMonthStart && t.timestamp <= currentMonthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Estatísticas globais do mês (considerando apenas categorias ativas nos totais)
  const { totalSpent, totalBudget, overallPercent } = useMemo(() => {
    const consideredCategories = categories.filter((c) => c.considerar !== false);
    const consideredCatIds = new Set(consideredCategories.map((c) => c.id));

    const spent = transactions
      .filter(
        (t) =>
          t.type === 'EXPENSE' &&
          t.timestamp >= currentMonthStart &&
          t.timestamp <= currentMonthEnd &&
          consideredCatIds.has(t.categoryId)
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const budget = consideredCategories.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
    const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    return { totalSpent: spent, totalBudget: budget, overallPercent: percent };
  }, [transactions, categories, currentMonthStart, currentMonthEnd]);

  const handleOpenCreate = () => {
    setSelectedCategoryToEdit(null);
    setCategoryModalVisible(true);
  };

  const handleOpenEdit = (category: Category) => {
    setSelectedCategoryToEdit(category);
    setCategoryModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cabeçalho Editorial Neo-Fintech */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>
              METAS & CATEGORIAS
            </Text>
            <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
              Orçamento de {currentMonthName}
            </Text>
          </View>

          <Pressable
            onPress={handleOpenCreate}
            style={({ pressed }) => [
              styles.createButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <Plus size={14} color={colors.primaryForeground} style={{ marginRight: 4 }} />
            <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>
              NOVA
            </Text>
          </Pressable>
        </View>

        {/* Card de Resumo Geral do Orçamento */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <Text style={[styles.summaryCardLabel, { color: colors.textMuted }]} numberOfLines={1}>
                CONSUMO GLOBAL DO MÊS
              </Text>
              <Text
                style={[styles.summarySpent, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {formatBRL(totalSpent, privacyMode)}
              </Text>
            </View>

            <View
              style={[
                styles.summaryPill,
                {
                  flexShrink: 0,
                  backgroundColor:
                    overallPercent > 100
                      ? colors.dangerSubtle
                      : overallPercent >= 75
                      ? colors.warningSubtle
                      : colors.successSubtle,
                  borderColor:
                    overallPercent > 100
                      ? colors.danger
                      : overallPercent >= 75
                      ? colors.warning
                      : colors.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.summaryPillText,
                  {
                    color:
                      overallPercent > 100
                        ? colors.danger
                        : overallPercent >= 75
                        ? colors.warning
                        : colors.success,
                  },
                ]}
              >
                {totalBudget > 0 ? `${overallPercent}% DO TETO` : 'SEM TETOS DEFINIDOS'}
              </Text>
            </View>
          </View>

          {/* Barra de Progresso Global Animada */}
          {totalBudget > 0 && (
            <View style={styles.progressContainer}>
              <AnimatedGoalBar
                percent={overallPercent}
                color={
                  overallPercent > 100
                    ? colors.danger
                    : overallPercent >= 75
                    ? colors.warning
                    : colors.primary
                }
                trackStyle={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                ]}
                barStyle={styles.progressBar}
              />

              <View style={styles.progressMeta}>
                <Text style={[styles.progressMetaText, { color: colors.textMuted }]}>
                  {totalSpent <= totalBudget
                    ? `Restante: ${formatBRL(totalBudget - totalSpent, privacyMode)}`
                    : `Excedido em: ${formatBRL(totalSpent - totalBudget, privacyMode)}`}
                </Text>
                <Text style={[styles.progressMetaText, { color: colors.textMuted }]}>
                  Teto: {formatBRL(totalBudget, privacyMode)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Lista de Categorias */}
        <View style={styles.categoryListHeader}>
          <Text style={[styles.categoryListTitle, { color: colors.text }]}>
            Categorias e orçamentos ({categories.length})
          </Text>
          <Text style={[styles.categoryListSubtitle, { color: colors.textMuted }]}>
            Toque em uma categoria para ajustar seu teto de gastos
          </Text>
        </View>

        <View style={styles.categoryList}>
          {categories.map((cat) => {
            const spent = getCategorySpent(cat.id);
            const hasLimit = cat.budgetLimit > 0;
            const percent = hasLimit ? Math.round((spent / cat.budgetLimit) * 100) : 0;
            const isCritical = hasLimit && percent > 90;
            const isWarning = hasLimit && percent >= 70 && percent <= 90;
            const isProtected = cat.id === 'cat_others';
            const IconComp = getCategoryIconComponent(cat.icon);

            return (
              <Pressable
                key={cat.id}
                onPress={() => handleOpenEdit(cat)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isCritical
                      ? colors.danger
                      : isWarning
                      ? colors.warning
                      : colors.borderSubtle,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  {/* Squircle com Ícone & Cor */}
                  <View
                    style={[
                      styles.iconSquircle,
                      {
                        backgroundColor: `${cat.color}20`,
                        borderColor: `${cat.color}45`,
                      },
                    ]}
                  >
                    <IconComp size={20} color={cat.color} />
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      {isProtected && (
                        <View
                          style={[
                            styles.protectedPill,
                            {
                              backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <Lock size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                          <Text style={[styles.protectedPillText, { color: colors.textMuted }]}>
                            PADRÃO
                          </Text>
                        </View>
                      )}
                      {cat.considerar === false && (
                        <View
                          style={[
                            styles.ignoredPill,
                            {
                              backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <EyeOff size={10} color={colors.textMuted} style={{ marginRight: 3 }} />
                          <Text style={[styles.ignoredPillText, { color: colors.textMuted }]}>
                            DESCONSIDERADA
                          </Text>
                        </View>
                      )}
                      {cat.isInvestimento && (
                        <View
                          style={[
                            styles.investPill,
                            {
                              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                              borderColor: 'rgba(16, 185, 129, 0.3)',
                            },
                          ]}
                        >
                          <TrendingUp size={10} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={[styles.investPillText, { color: '#10B981' }]}>
                            INVESTIMENTO
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.categorySpentText, { color: colors.textSecondary }]}>
                      Gasto: {formatBRL(spent, privacyMode)}
                      {hasLimit ? ` / ${formatBRL(cat.budgetLimit, privacyMode)}` : ' • Sem teto'}
                    </Text>
                  </View>

                  {/* Botão de Ajuste ou Seta */}
                  <View style={styles.cardRightAction}>
                    {hasLimit && (
                      <View
                        style={[
                          styles.percentBadge,
                          {
                            backgroundColor: isCritical
                              ? colors.dangerSubtle
                              : isWarning
                              ? colors.warningSubtle
                              : colors.surfaceSubtle,
                            borderColor: isCritical
                              ? colors.danger
                              : isWarning
                              ? colors.warning
                              : colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.percentBadgeText,
                            {
                              color: isCritical
                                ? colors.danger
                                : isWarning
                                ? colors.warning
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {percent}%
                        </Text>
                      </View>
                    )}
                    <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                  </View>
                </View>

                {/* Barra de Progresso do Teto Individual Animada */}
                {hasLimit && (
                  <AnimatedGoalBar
                    percent={percent}
                    color={
                      isCritical
                        ? colors.danger
                        : isWarning
                        ? colors.warning
                        : cat.color
                    }
                    trackStyle={styles.individualProgressTrack}
                    barStyle={styles.individualProgressBar}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal de Criação / Edição de Categoria */}
      <CategoryModal
        visible={categoryModalVisible}
        categoryToEdit={selectedCategoryToEdit}
        onClose={() => setCategoryModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // Espaço para a barra de navegação flutuante
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: Typography.bold,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  screenSubtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryCardLabel: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  summarySpent: {
    fontFamily: Typography.bold,
    fontSize: 24,
    marginTop: 4,
  },
  summaryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryPillText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressMetaText: {
    fontFamily: Typography.medium,
    fontSize: 11,
  },
  categoryListHeader: {
    marginBottom: 12,
  },
  categoryListTitle: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  categoryListSubtitle: {
    fontFamily: Typography.regular,
    fontSize: 11,
    marginTop: 2,
  },
  categoryList: {
    gap: 10,
  },
  categoryCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryName: {
    fontFamily: Typography.bold,
    fontSize: 15,
    flexShrink: 1,
  },
  protectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  protectedPillText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  ignoredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  ignoredPillText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  investPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  investPillText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  categorySpentText: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  cardRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  percentBadgeText: {
    fontFamily: Typography.bold,
    fontSize: 11,
  },
  individualProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 12,
    overflow: 'hidden',
  },
  individualProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
