import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const category = categories.find((c) => c.id === transaction.categoryId);
  const card = cards.find((c) => c.id === transaction.cardId);

  const isRefund = transaction.type === 'REFUND';
  const isIncome = transaction.type === 'PIX_IN';

  const formatBRL = (cents: number) => {
    if (privacyMode) return '••••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.leftColumn}>
        <View style={styles.merchantHeader}>
          <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          {isRefund && (
            <View style={[styles.refundBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Text style={[styles.refundBadgeText, { color: colors.success }]}>ESTORNO</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.bankTag, { color: colors.textMuted }]}>
            {card?.bankName}
          </Text>
          <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.categoryTag, { color: colors.textSecondary }]}>
            {category?.name}
          </Text>
          <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.timeTag, { color: colors.textMuted }]}>
            {formatTime(transaction.timestamp)}
          </Text>
        </View>
      </View>

      <View style={styles.rightColumn}>
        <Text
          style={[
            styles.amountText,
            {
              color: isRefund || isIncome ? colors.success : colors.text,
            },
          ]}
        >
          {isRefund ? '+' : '-'} {formatBRL(transaction.amount)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  refundBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refundBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bankTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dot: {
    fontSize: 10,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeTag: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
});
