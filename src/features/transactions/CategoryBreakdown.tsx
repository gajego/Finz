import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Sliders,
  AlertTriangle,
  Utensils,
  Car,
  Gamepad2,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Tag,
  Coffee,
  Plus,
  ArrowRight,
  LucideIcon,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

const getCategoryIcon = (iconName: string): LucideIcon => {
  switch (iconName?.toLowerCase()) {
    case 'utensils':
    case 'food':
    case 'alimentação':
      return Utensils;
    case 'car':
    case 'transport':
    case 'transporte':
      return Car;
    case 'gamepad-2':
    case 'gamepad':
    case 'leisure':
    case 'lazer & setup':
      return Gamepad2;
    case 'trending-up':
    case 'investimentos':
    case 'investing':
      return TrendingUp;
    case 'shopping-bag':
    case 'shopping':
    case 'compras':
      return ShoppingBag;
    case 'coffee':
      return Coffee;
    case 'sparkles':
      return Sparkles;
    default:
      return Tag;
  }
};

interface CategoryBreakdownProps {
  onOpenBudgetManager: (categoryId?: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ onOpenBudgetManager }) => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  // Intervalo do mês atual em milissegundos
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
    const name = d.toLocaleDateString('pt-BR', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  // Soma exclusivamente as despesas do mês corrente para a categoria
  const getCategorySpent = (categoryId: string) => {
    return transactions
      .filter((t) => {
        if (t.categoryId !== categoryId || t.type !== 'EXPENSE') return false;
        return t.timestamp >= currentMonthStart && t.timestamp <= currentMonthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatBRL = (cents: number) => {
    if (privacyMode) return '••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  };

  return (
    <View style={styles.container}>
      {/* Cabeçalho da Seção */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>METAS & TETOS MENSAIS</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Gastos de {currentMonthName} • Toque para ajustar
          </Text>
        </View>

        <Pressable
          onPress={() => onOpenBudgetManager()}
          style={({ pressed }) => [
            styles.configButton,
            {
              backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.surface,
              borderColor: colors.borderStrong,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          hitSlop={8}
        >
          <Sliders size={12} color={colors.primary} />
          <Text style={[styles.configButtonText, { color: colors.text }]}>AJUSTAR</Text>
        </Pressable>
      </View>

      {/* Grid Bento Neo-Fintech com Cards Refinados */}
      <View style={styles.grid}>
        {categories.map((cat) => {
          const spent = getCategorySpent(cat.id);
          const hasLimit = cat.budgetLimit > 0;
          const percent = hasLimit ? Math.round((spent / cat.budgetLimit) * 100) : 0;
          const remaining = cat.budgetLimit - spent;

          // Classificação de status dinâmico (3 níveis de threshold)
          const isCritical = hasLimit && percent > 90;
          const isWarning = hasLimit && percent >= 70 && percent <= 90;
          const isSafe = hasLimit && percent < 70;

          const statusColor = isCritical
            ? colors.danger
            : isWarning
            ? colors.warning
            : isSafe
            ? colors.success
            : colors.textMuted;

          const statusBg = isCritical
            ? colors.dangerSubtle
            : isWarning
            ? colors.warningSubtle
            : isSafe
            ? colors.successSubtle
            : colors.surfaceSubtle;

          const cardBorderColor = isCritical
            ? mode === 'dark'
              ? 'rgba(255, 59, 48, 0.38)'
              : 'rgba(225, 29, 72, 0.3)'
            : isWarning
            ? mode === 'dark'
              ? 'rgba(245, 158, 11, 0.32)'
              : 'rgba(217, 119, 6, 0.25)'
            : colors.border;

          const cardBgColor = isCritical
            ? mode === 'dark'
              ? 'rgba(255, 59, 48, 0.07)'
              : 'rgba(225, 29, 72, 0.04)'
            : isWarning
            ? mode === 'dark'
              ? 'rgba(245, 158, 11, 0.05)'
              : 'rgba(217, 119, 6, 0.03)'
            : mode === 'dark'
            ? colors.surface
            : colors.surfaceElevated;

          const IconComponent = getCategoryIcon(cat.icon);
          const categoryThemeColor = cat.color || colors.primary;

          return (
            <Pressable
              key={cat.id}
              onPress={() => onOpenBudgetManager(cat.id)}
              style={({ pressed }) => [
                styles.bentoCard,
                {
                  backgroundColor: cardBgColor,
                  borderColor: cardBorderColor,
                  transform: [{ scale: pressed ? 0.975 : 1 }],
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              {/* Topo do Card: Squircle temático com ícone + Pill Dinâmico de Porcentagem */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconSquircle,
                    {
                      backgroundColor: `${categoryThemeColor}14`,
                      borderColor: `${categoryThemeColor}28`,
                    },
                  ]}
                >
                  <IconComponent size={16} color={categoryThemeColor} />
                </View>

                <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                  {isCritical && (
                    <AlertTriangle size={10} color={statusColor} style={{ marginRight: 3 }} />
                  )}
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {hasLimit ? `${percent}%` : 'SEM TETO'}
                  </Text>
                </View>
              </View>

              {/* Corpo: Título da Categoria */}
              <Text
                style={[styles.categoryName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {cat.name.toUpperCase()}
              </Text>

              {/* Gasto Atual em Destaque vs Meta Total */}
              <View style={styles.amountRow}>
                <Text
                  style={[
                    styles.spentAmount,
                    { color: isCritical ? colors.danger : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {formatBRL(spent)}
                </Text>
                <Text
                  style={[styles.limitAmount, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  / {hasLimit ? formatBRL(cat.budgetLimit) : 'Livre'}
                </Text>
              </View>

              {/* Barra de Progresso com Cantos Arredondados e Altura Suave (7px) */}
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor:
                      mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(percent, 100)}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>

              {/* Rodapé do Card: Restante ou Ação de Ajuste */}
              <View style={styles.cardFooter}>
                {hasLimit ? (
                  remaining >= 0 ? (
                    <Text style={[styles.remainingText, { color: colors.textMuted }]}>
                      Restam {formatBRL(remaining)}
                    </Text>
                  ) : (
                    <Text style={[styles.remainingText, { color: colors.danger, fontFamily: Typography.bold }]}>
                      Excedido em {formatBRL(Math.abs(remaining))}
                    </Text>
                  )
                ) : (
                  <View style={styles.setCeilingRow}>
                    <Text style={[styles.setCeilingText, { color: colors.primary }]}>
                      Definir teto
                    </Text>
                    <ArrowRight size={10} color={colors.primary} />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  sectionSubtitle: {
    fontFamily: Typography.regular,
    fontSize: 11,
    marginTop: 2,
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  configButtonText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoCard: {
    width: '48.5%',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  statusPillText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  categoryName: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  spentAmount: {
    fontFamily: Typography.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  limitAmount: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 7,
    borderRadius: 999,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  remainingText: {
    fontFamily: Typography.regular,
    fontSize: 10,
  },
  setCeilingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setCeilingText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
