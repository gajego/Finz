import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  RotateCcw,
  HeartPulse,
  GraduationCap,
  LucideIcon,
} from 'lucide-react-native';
import { Transaction } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import {
  parseMerchantAndInstallments,
  formatBRL,
  formatTime,
} from './transactionUtils';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
}

interface IconConfig {
  Icon: LucideIcon;
  bgColor?: string;
  borderColor?: string;
  iconColor?: string;
}

const getTransactionIcon = (
  tx: Transaction,
  categoryName?: string,
  categoryColor?: string,
  isDark = true
): IconConfig => {
  if (tx.type === 'REFUND') {
    return {
      Icon: RotateCcw,
      bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(217, 119, 6, 0.10)',
      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(217, 119, 6, 0.25)',
      iconColor: isDark ? '#F59E0B' : '#D97706',
    };
  }

  if (tx.type === 'PIX_IN') {
    return {
      Icon: ArrowDownLeft,
      bgColor: isDark ? 'rgba(52, 211, 153, 0.14)' : 'rgba(5, 150, 105, 0.10)',
      borderColor: isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(5, 150, 105, 0.25)',
      iconColor: isDark ? '#34D399' : '#059669',
    };
  }

  if (tx.type === 'PIX_OUT') {
    return {
      Icon: ArrowUpRight,
      bgColor: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(225, 29, 72, 0.08)',
      borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(225, 29, 72, 0.20)',
      iconColor: isDark ? '#F87171' : '#E11D48',
    };
  }

  const name = `${tx.merchant} ${categoryName || ''}`.toLowerCase();

  let Icon: LucideIcon = CreditCard;

  if (name.includes('coffee') || name.includes('starbucks') || name.includes('café') || name.includes('padaria')) {
    Icon = Coffee;
  } else if (name.includes('uber') || name.includes('posto') || name.includes('shell') || name.includes('combustivel') || name.includes('transporte') || name.includes('99')) {
    Icon = Car;
  } else if (name.includes('alimentação') || name.includes('fogo de chão') || name.includes('restaurante') || name.includes('ifood') || name.includes('burger')) {
    Icon = Utensils;
  } else if (name.includes('lazer') || name.includes('steam') || name.includes('setup') || name.includes('game') || name.includes('playstation')) {
    Icon = Gamepad2;
  } else if (name.includes('shopping') || name.includes('amazon') || name.includes('apple') || name.includes('mercado') || name.includes('loja')) {
    Icon = ShoppingBag;
  } else if (name.includes('farmacia') || name.includes('drogaria') || name.includes('saude') || name.includes('hospital')) {
    Icon = HeartPulse;
  } else if (name.includes('faculdade') || name.includes('curso') || name.includes('escola') || name.includes('educação')) {
    Icon = GraduationCap;
  } else if (name.includes('luz') || name.includes('energia') || name.includes('enel') || name.includes('eletric')) {
    Icon = Zap;
  } else if (name.includes('internet') || name.includes('wifi') || name.includes('claro') || name.includes('vivo') || name.includes('tim')) {
    Icon = Wifi;
  } else if (name.includes('aluguel') || name.includes('condomínio') || name.includes('casa')) {
    Icon = Home;
  } else if (name.includes('investimento') || name.includes('rendimento')) {
    Icon = TrendingUp;
  }

  if (categoryColor) {
    return {
      Icon,
      bgColor: `${categoryColor}18`,
      borderColor: `${categoryColor}35`,
      iconColor: categoryColor,
    };
  }

  return { Icon };
};

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(
  ({ transaction, onPress }) => {
    const { colors, mode } = useTheme();
    const categories = useWalletStore((s) => s.categories);
    const cards = useWalletStore((s) => s.cards);
    const privacyMode = useWalletStore((s) => s.privacyMode);

    const isDark = mode === 'dark';
    const category = categories.find((c) => c.id === transaction.categoryId);
    const card = cards.find((c) => c.id === transaction.cardId);

    const isRefund = transaction.type === 'REFUND';
    const isIncome = transaction.type === 'PIX_IN';
    const isPixOut = transaction.type === 'PIX_OUT';

    const { cleanName, installment } = parseMerchantAndInstallments(
      transaction.merchant,
      transaction.rawText
    );

    const { Icon, bgColor, borderColor, iconColor } = getTransactionIcon(
      transaction,
      category?.name,
      category?.color,
      isDark
    );

    // Indicadores visuais claros no padrão Neo-Fintech
    // Despesas: Coral/vermelho sutil (- R$ 30,48)
    // Recebimentos: Verde menta (+ R$ 150,00)
    // Estornos: Âmbar/Verde menta com badge ESTORNO
    const coralRed = isDark ? '#F87171' : '#E11D48';
    const mintGreen = isDark ? '#34D399' : '#059669';
    const amberWarning = isDark ? '#F59E0B' : '#D97706';

    let amountColor = coralRed;
    let signPrefix = '- ';

    if (isRefund) {
      amountColor = amberWarning;
      signPrefix = '+ ';
    } else if (isIncome) {
      amountColor = mintGreen;
      signPrefix = '+ ';
    }

    const accessibilityText = `${
      isRefund ? 'Estorno' : isIncome ? 'Recebimento Pix' : isPixOut ? 'Envio Pix' : 'Despesa'
    }, ${cleanName}, ${signPrefix}${formatBRL(transaction.amount, privacyMode)}, ${
      installment ? `parcela ${installment.current} de ${installment.total}, ` : ''
    }${card?.bankName ? `no banco ${card.bankName}, ` : ''}às ${formatTime(
      transaction.timestamp
    )}`;

    return (
      <Pressable
        onPress={() => onPress?.(transaction)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityText}
        accessibilityHint="Toque para inspecionar os detalhes desta movimentação"
        style={({ pressed }) => [
          styles.row,
          {
            borderBottomColor: colors.borderSubtle,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        {/* Ícone Vetorial Lucide em Squircle Refinado com Cor Temática */}
        <View
          style={[
            styles.iconSquircle,
            {
              backgroundColor: bgColor || colors.surfaceElevated,
              borderColor: borderColor || colors.borderSubtle,
            },
          ]}
        >
          <Icon
            size={18}
            color={iconColor || colors.textSecondary}
            strokeWidth={2}
          />
        </View>

        {/* Detalhes: Nome Limpo do Estabelecimento & Metadados */}
        <View style={styles.centerColumn}>
          <Text
            style={[styles.merchantName, { color: colors.text }]}
            numberOfLines={1}
          >
            {cleanName}
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
                <Text
                  style={[styles.categoryTag, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
                <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
              </>
            )}

            {/* Badge de Parcela se houver */}
            {installment && (
              <>
                <View
                  style={[
                    styles.installmentBadge,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.installmentText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    PARC {installment.text}
                  </Text>
                </View>
                <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
              </>
            )}

            <Text style={[styles.timeTag, { color: colors.textMuted }]}>
              {formatTime(transaction.timestamp)}
            </Text>
          </View>
        </View>

        {/* Valor com Sinal e Pill de Status Temático */}
        <View style={styles.rightColumn}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {signPrefix}
            {formatBRL(transaction.amount, privacyMode)}
          </Text>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isRefund
                  ? isDark
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(217, 119, 6, 0.10)'
                  : isIncome
                  ? isDark
                    ? 'rgba(52, 211, 153, 0.14)'
                    : 'rgba(5, 150, 105, 0.10)'
                  : colors.pillBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isRefund
                    ? amberWarning
                    : isIncome
                    ? mintGreen
                    : colors.textSecondary,
                },
              ]}
            >
              {isRefund
                ? 'ESTORNO'
                : isIncome
                ? 'RECEBIDO'
                : isPixOut
                ? 'PIX OUT'
                : 'CONCLUÍDO'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
);

TransactionItem.displayName = 'TransactionItem';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconSquircle: {
    width: 42,
    height: 42,
    borderRadius: Radii.md, // Squircle 14px
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerColumn: {
    flex: 1,
    justifyContent: 'center',
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
    flexWrap: 'nowrap',
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
    maxWidth: 90,
  },
  installmentBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  installmentText: {
    fontFamily: Typography.bold,
    fontSize: 8.5,
    letterSpacing: 0.4,
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
    fontSize: 14.5,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.6,
  },
});
