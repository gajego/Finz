import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Utensils,
  Car,
  Gamepad2,
  TrendingUp,
  ShoppingBag,
  Coffee,
  Zap,
  Wifi,
  Home,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  LucideIcon,
} from 'lucide-react-native';
import { Transaction } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface TransactionItemProps {
  transaction: Transaction;
}

const getTransactionIcon = (tx: Transaction, categoryName?: string): { Icon: LucideIcon; color?: string } => {
  if (tx.type === 'REFUND' || tx.type === 'PIX_IN') {
    return { Icon: ArrowDownLeft };
  }

  const name = (tx.merchant + ' ' + (categoryName || '')).toLowerCase();

  if (name.includes('coffee') || name.includes('starbucks') || name.includes('café') || name.includes('padaria')) {
    return { Icon: Coffee };
  }
  if (name.includes('uber') || name.includes('posto') || name.includes('shell') || name.includes('combustivel') || name.includes('transporte') || name.includes('99')) {
    return { Icon: Car };
  }
  if (name.includes('alimentação') || name.includes('fogo de chão') || name.includes('restaurante') || name.includes('ifood') || name.includes('burger')) {
    return { Icon: Utensils };
  }
  if (name.includes('lazer') || name.includes('steam') || name.includes('setup') || name.includes('game') || name.includes('playstation')) {
    return { Icon: Gamepad2 };
  }
  if (name.includes('shopping') || name.includes('amazon') || name.includes('apple') || name.includes('mercado') || name.includes('loja')) {
    return { Icon: ShoppingBag };
  }
  if (name.includes('luz') || name.includes('energia') || name.includes('enel') || name.includes('eletric')) {
    return { Icon: Zap };
  }
  if (name.includes('internet') || name.includes('wifi') || name.includes('claro') || name.includes('vivo')) {
    return { Icon: Wifi };
  }
  if (name.includes('aluguel') || name.includes('condomínio') || name.includes('casa')) {
    return { Icon: Home };
  }
  if (name.includes('investimento') || name.includes('rendimento')) {
    return { Icon: TrendingUp };
  }

  return { Icon: CreditCard };
};

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const { colors } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const cards = useWalletStore((s) => s.cards);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  const category = categories.find((c) => c.id === transaction.categoryId);
  const card = cards.find((c) => c.id === transaction.cardId);

  const isRefund = transaction.type === 'REFUND';
  const isIncome = transaction.type === 'PIX_IN';

  const { Icon: TransactionIcon } = getTransactionIcon(transaction, category?.name);

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
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      {/* Ícone Vetorial em Container Circular Elegante (Aurex & DailyFlutterUI) */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isRefund || isIncome
              ? colors.successSubtle
              : colors.surfaceElevated,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <TransactionIcon
          size={18}
          color={isRefund || isIncome ? colors.success : colors.textSecondary}
        />
      </View>

      {/* Detalhes do Estabelecimento / Transferência */}
      <View style={styles.centerColumn}>
        <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={1}>
          {transaction.merchant}
        </Text>

        <View style={styles.metaRow}>
          {card?.bankName && (
            <>
              <Text style={[styles.bankTag, { color: colors.textMuted }]}>
                {card.bankName}
              </Text>
              <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
            </>
          )}
          {category?.name && (
            <>
              <Text style={[styles.categoryTag, { color: colors.textSecondary }]}>
                {category.name}
              </Text>
              <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
            </>
          )}
          <Text style={[styles.timeTag, { color: colors.textMuted }]}>
            {formatTime(transaction.timestamp)}
          </Text>
        </View>
      </View>

      {/* Valor e Badge de Status Pill */}
      <View style={styles.rightColumn}>
        <Text
          style={[
            styles.amountText,
            {
              color: isRefund || isIncome ? colors.success : colors.text,
            },
          ]}
        >
          {isRefund || isIncome ? '+' : '-'} {formatBRL(transaction.amount)}
        </Text>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isRefund || isIncome
                ? colors.successSubtle
                : colors.pillBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: isRefund
                  ? colors.success
                  : isIncome
                  ? colors.success
                  : colors.textSecondary,
              },
            ]}
          >
            {isRefund ? 'ESTORNO' : isIncome ? 'RECEBIDO' : 'CONCLUÍDO'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerColumn: {
    flex: 1,
  },
  merchantName: {
    fontFamily: Typography.bold,
    fontSize: 14,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bankTag: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dot: {
    fontSize: 9,
  },
  categoryTag: {
    fontFamily: Typography.regular,
    fontSize: 11,
  },
  timeTag: {
    fontFamily: Typography.regular,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  rightColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontFamily: Typography.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.6,
  },
});

