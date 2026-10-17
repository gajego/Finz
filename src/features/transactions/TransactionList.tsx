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
      {/* Cabeçalho da Lista */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>REGISTRO DE ATIVIDADES</Text>
        <Text style={[styles.countBadge, { color: colors.textMuted }]}>
          {transactions.length} EVENTOS
        </Text>
      </View>

      {/* Lista Linha a Linha */}
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
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  list: {
    gap: 0,
  },
});
