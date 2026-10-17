import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowDownRight, ArrowUpLeft, RotateCcw } from 'lucide-react-native';
import { Transaction } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const cards = useWalletStore((s) => s.cards);

  const category = categories.find((c) => c.id === transaction.categoryId);
  const card = cards.find((c) => c.id === transaction.cardId);

  const isRefund = transaction.type === 'REFUND';
  const isIncome = transaction.type === 'PIX_IN';

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.left}>
        {/* Ícone de Tipo */}
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isRefund
                ? colors.primaryMuted
                : isIncome
                ? colors.secondaryMuted
                : colors.borderLight,
            },
          ]}
        >
          {isRefund ? (
            <RotateCcw size={18} color={colors.primary} />
          ) : isIncome ? (
            <ArrowDownRight size={18} color={colors.secondary} />
          ) : (
            <ArrowUpLeft size={18} color={colors.danger} />
          )}
        </View>

        <View>
          <Text style={[styles.merchant, { color: colors.text }]}>{transaction.merchant}</Text>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: category ? `${category.color}20` : colors.borderLight },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: category ? category.color : colors.textSecondary },
                ]}
              >
                {category?.name || 'Geral'}
              </Text>
            </View>
            <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
            <Text style={[styles.bankInfo, { color: colors.textSecondary }]}>
              {card?.bankName || 'Banco'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            {
              color: isRefund || isIncome ? colors.primary : colors.text,
            },
          ]}
        >
          {isRefund ? '+' : '-'} {formatBRL(transaction.amount)}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatTime(transaction.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchant: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dot: {
    fontSize: 10,
  },
  bankInfo: {
    fontSize: 11,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
  },
});
