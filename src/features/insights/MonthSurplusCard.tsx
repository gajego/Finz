import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  PiggyBank,
  Coins,
  Clock,
  Landmark,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { getMonthSurplusHistory } from './monthSurplusService';

interface MonthSurplusCardProps {
  noMargin?: boolean;
  onNavigateToGoals?: () => void;
}

export const MonthSurplusCard: React.FC<MonthSurplusCardProps> = ({
  noMargin,
  onNavigateToGoals,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);
  const cards = useWalletStore((s) => s.cards);
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const presentationMode = useWalletStore((s) => s.presentationMode);

  // Histórico de sobras dos últimos 5 meses
  const history = useMemo(() => {
    return getMonthSurplusHistory(transactions, categories, cards, 5, presentationMode);
  }, [transactions, categories, cards, presentationMode]);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const selectedRecord = history[selectedMonthIndex] || history[0];

  // Identifica se estamos nos primeiros 7 dias do mês (destaque "Dia 1")
  const isFirstDays = useMemo(() => {
    const day = new Date().getDate();
    return day <= 7;
  }, []);

  const hasSalaryCategory = useMemo(() => {
    return categories.some(
      (c) => (c.type === 'income' && c.incomeType === 'salary') || c.isSalario || c.incomeType === 'salary'
    );
  }, [categories]);

  if (!selectedRecord) return null;

  const isAccountPositive = selectedRecord.accountBalance >= 0;
  const heroColor = isAccountPositive ? '#10B981' : '#EF4444';
  const isNetPositive = selectedRecord.netSurplus >= 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          marginHorizontal: noMargin ? 0 : 16,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              },
            ]}
          >
            <PiggyBank size={18} color="#10B981" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]} numberOfLines={1}>
              FECHAMENTO 23:59 • POUPANÇA REAL
            </Text>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Sobra do Mês
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: !selectedRecord.isClosed
                ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                : isFirstDays && selectedMonthIndex === 1
                ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)')
                : (isDark ? colors.surfaceElevated : colors.background),
              borderColor: !selectedRecord.isClosed
                ? '#3B82F6'
                : isFirstDays && selectedMonthIndex === 1
                ? '#10B981'
                : colors.borderSubtle,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color: !selectedRecord.isClosed
                  ? '#3B82F6'
                  : isFirstDays && selectedMonthIndex === 1
                  ? '#10B981'
                  : colors.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            {!selectedRecord.isClosed
              ? 'Em Andamento'
              : isFirstDays && selectedMonthIndex === 1
              ? '✨ Consolidado Dia 1'
              : 'Fechado 23:59'}
          </Text>
        </View>
      </View>

      {/* Seletor Horizontal de Meses */}
      {history.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthChipsRow}
        >
          {history.map((item, idx) => {
            const isSelected = selectedMonthIndex === idx;
            return (
              <Pressable
                key={item.monthKey}
                onPress={() => setSelectedMonthIndex(idx)}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.surfaceElevated
                      : colors.background,
                    borderColor: isSelected ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.textSecondary,
                      fontFamily: isSelected ? Typography.bold : Typography.medium,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.monthLabel.split('/')[0]} {idx === 0 ? '(Atual)' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Valor em Destaque da Sobra (Saldo em Conta) */}
      <View style={styles.surplusHero}>
        <Text style={[styles.surplusHeroLabel, { color: colors.textMuted }]}>
          {selectedRecord.isClosed
            ? `SALDO EM CONTA EM ${selectedRecord.monthLabel.toUpperCase()} (SOBRA)`
            : 'SALDO ATUAL EM CONTA (SOBRA DO MÊS)'}
        </Text>

        <View style={styles.amountRow}>
          <Text
            style={[styles.surplusHeroValue, { color: heroColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatBRL(selectedRecord.accountBalance, privacyMode)}
          </Text>
        </View>

        <View style={styles.timestampRow}>
          <Clock size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={[styles.timestampText, { color: colors.textMuted }]}>
            {selectedRecord.isClosed
              ? 'Saldo que havia na conta até as 23:59 do último dia'
              : 'Saldo atual consolidado disponível em conta'}
          </Text>
        </View>
      </View>

      {/* Grid com 4 Sub-métricas Chave */}
      <View style={styles.gridContainer}>
        {/* Card 1: Salário Real */}
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricCardHeader}>
            <Coins size={13} color="#3B82F6" />
            <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Salário Real
            </Text>
          </View>
          <Text
            style={[styles.metricCardValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {selectedRecord.salaryAmount > 0
              ? formatBRL(selectedRecord.salaryAmount, privacyMode)
              : 'Não marcado'}
          </Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]} numberOfLines={1}>
            {selectedRecord.salaryAmount > 0
              ? 'Recebido em categorias de salário'
              : 'Defina na aba Metas'}
          </Text>
        </View>

        {/* Card 2: Receitas Totais */}
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricCardHeader}>
            <TrendingUp size={13} color="#10B981" />
            <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Receitas Totais
            </Text>
          </View>
          <Text
            style={[styles.metricCardValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatBRL(selectedRecord.totalIncome, privacyMode)}
          </Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]} numberOfLines={1}>
            Entradas no mês
          </Text>
        </View>

        {/* Card 3: Gastos do Mês */}
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricCardHeader}>
            <TrendingDown size={13} color="#EF4444" />
            <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Gastos do Mês
            </Text>
          </View>
          <Text
            style={[styles.metricCardValue, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatBRL(selectedRecord.totalExpense, privacyMode)}
          </Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]} numberOfLines={1}>
            Despesas e Pix Débito
          </Text>
        </View>

        {/* Card 4: Balanço Líquido */}
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.metricCardHeader}>
            <Landmark size={13} color="#8B5CF6" />
            <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Balanço Líquido
            </Text>
          </View>
          <Text
            style={[
              styles.metricCardValue,
              { color: isNetPositive ? '#10B981' : '#EF4444' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {isNetPositive ? '+' : ''}
            {formatBRL(selectedRecord.netSurplus, privacyMode)}
          </Text>
          <Text style={[styles.metricCardSub, { color: colors.textMuted }]} numberOfLines={1}>
            Receitas − Gastos
          </Text>
        </View>
      </View>

      {/* Dica de Salário se nenhuma categoria foi marcada */}
      {!hasSalaryCategory && (
        <Pressable
          onPress={onNavigateToGoals}
          style={[
            styles.tipBox,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.06)',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
            },
          ]}
        >
          <Sparkles size={13} color="#3B82F6" style={{ marginTop: 2, marginRight: 8, flexShrink: 0 }} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            <Text style={{ fontFamily: Typography.bold, color: '#3B82F6' }}>
              Identifique seu salário:
            </Text>{' '}
            Acesse a aba Metas, edite sua categoria de proventos e marque a opção "Categoria de salário". O app apurará seu salário real e a sobra com precisão cirúrgica.
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
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
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
  title: {
    fontFamily: Typography.bold,
    fontSize: 15,
    marginTop: 1,
  },
  statusPill: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  monthChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthChipText: {
    fontSize: 11,
  },
  surplusHero: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(150, 150, 150, 0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.15)',
  },
  surplusHeroLabel: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  amountRow: {
    marginTop: 4,
  },
  surplusHeroValue: {
    fontFamily: Typography.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timestampText: {
    fontFamily: Typography.regular,
    fontSize: 10.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metricCard: {
    width: '48.5%',
    flexGrow: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricCardLabel: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  metricCardValue: {
    fontFamily: Typography.bold,
    fontSize: 14,
    marginTop: 4,
  },
  metricCardSub: {
    fontFamily: Typography.regular,
    fontSize: 9,
    marginTop: 2,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  tipText: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
