import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { TransactionItem } from './TransactionItem';

export const TransactionList: React.FC = () => {
  const { colors } = useTheme();
  const transactions = useWalletStore((s) => s.transactions);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Histórico Recente</Text>
        <Text style={[styles.badge, { backgroundColor: colors.primaryMuted, color: colors.primary }]}>
          Automático (Listener)
        </Text>
      </View>

      <View style={styles.list}>
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  list: {
    gap: 2,
  },
});
