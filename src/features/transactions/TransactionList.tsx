import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ReceiptText } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  visibleCount?: number;
  onEndReached?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  visibleCount = 15,
  onEndReached,
}) => {
  const { colors } = useTheme();
  const transactions = useWalletStore((s) => s.transactions);

  const visibleTransactions = transactions.slice(0, visibleCount);
  const hasMore = transactions.length > visibleTransactions.length;

  return (
    <View style={styles.container}>
      {/* Cabeçalho da Lista Estilo Aurex */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>ATIVIDADES RECENTES</Text>
        <View
          style={[
            styles.countPill,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
          ]}
        >
          <Text style={[styles.countBadge, { color: colors.textSecondary }]}>
            {hasMore
              ? `${visibleTransactions.length} DE ${transactions.length} EVENTOS`
              : `${transactions.length} ${transactions.length === 1 ? 'EVENTO' : 'EVENTOS'}`}
          </Text>
        </View>
      </View>

      {/* Lista Linha a Linha ou Empty State */}
      {transactions.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
            <ReceiptText size={24} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>NENHUM REGISTRO</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Compartilhe um comprovante Pix ou escaneie um documento acima para registrar gastos.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleTransactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}

          {/* Indicador de Paginação por Rolagem */}
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              <Pressable
                onPress={onEndReached}
                style={({ pressed }) => [
                  styles.loadMorePill,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>
                  Role para baixo para carregar mais ({visibleTransactions.length}/{transactions.length})
                </Text>
              </Pressable>
            </View>
          )}

          {!hasMore && transactions.length > 15 && (
            <View style={styles.endContainer}>
              <Text style={[styles.endText, { color: colors.textMuted }]}>
                Todas as {transactions.length} movimentações carregadas
              </Text>
            </View>
          )}
        </View>
      )}
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
    marginBottom: 12,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  countBadge: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  list: {
    gap: 0,
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadMoreContainer: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  loadMorePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  loadMoreText: {
    fontFamily: Typography.medium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  endContainer: {
    paddingTop: 18,
    paddingBottom: 8,
    alignItems: 'center',
  },
  endText: {
    fontFamily: Typography.medium,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

