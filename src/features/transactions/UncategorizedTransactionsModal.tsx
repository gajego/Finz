import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import {
  useSwipeModalDismiss,
  ModalTopHandle,
  ModalBottomHandle,
} from '@/components/ui/SwipeableModalSheet';
import {
  X,
  Tag,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  CreditCard,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react-native';
import { Transaction, Category, BankCard } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import { formatBRL, parseMerchantAndInstallments, BRAZIL_TIMEZONE } from './transactionUtils';
import { getCategoryIconComponent } from '@/features/categories/categoryIcons';

interface UncategorizedTransactionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UncategorizedTransactionsModal: React.FC<UncategorizedTransactionsModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const transactions = useWalletStore((s) => s.transactions);
  const categories = useWalletStore((s) => s.categories);
  const cards = useWalletStore((s) => s.cards);
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const updateTransactionCategory = useWalletStore((s) => s.updateTransactionCategory);

  const [recentlyCategorizedId, setRecentlyCategorizedId] = useState<string | null>(null);

  // Lista de categorias elegíveis (excluindo a própria 'cat_others' / 'Não categorizado')
  const selectableCategories = useMemo(() => {
    return categories.filter(
      (c) => c.id !== 'cat_others' && c.name.toLowerCase() !== 'não categorizado'
    );
  }, [categories]);

  // Filtra movimentações não categorizadas
  const uncategorizedTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'EXPENSE' &&
        (t.categoryId === 'cat_others' || !t.categoryId || t.categoryId === '')
    );
  }, [transactions]);

  const totalAmount = useMemo(() => {
    return uncategorizedTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [uncategorizedTransactions]);

  const handleCategorize = (txId: string, newCategoryId: string) => {
    console.log('[Uncategorized] Categorizando tx:', txId, 'para:', newCategoryId);
    setRecentlyCategorizedId(txId);
    setTimeout(() => {
      updateTransactionCategory(txId, newCategoryId);
      setRecentlyCategorizedId(null);
    }, 280);
  };

  const formatDate = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        timeZone: BRAZIL_TIMEZONE,
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <Animated.View style={[{ flex: 1 }, animatedSheetStyle]}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Barra Superior de Arrasto com Gesto de Arrastar para Fechar */}
          <ModalTopHandle
            panHandlers={handlePanResponder.panHandlers}
            color={colors.borderStrong}
          />

          {/* Top Header Editorial com Gesto de Arraste */}
          <View {...headerPanResponder.panHandlers} style={[styles.headerBar, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerTitleGroup}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isDark ? 'rgba(217, 249, 32, 0.15)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <Tag size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.screenEyebrow, { color: colors.primary }]}>
                ORGANIZAÇÃO FINANCEIRA
              </Text>
              <Text style={[styles.screenTitle, { color: colors.text }]}>
                CATEGORIZAR GASTOS
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <X size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Subheader / Status de Progresso */}
        <View
          style={[
            styles.statusBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.statusLeft}>
            <Text style={[styles.statusCountText, { color: colors.text }]}>
              {uncategorizedTransactions.length}{' '}
              {uncategorizedTransactions.length === 1 ? 'pendência' : 'pendências'}
            </Text>
            <Text style={[styles.statusTotalText, { color: colors.textSecondary }]}>
              Total:{' '}
              <Text style={{ color: colors.text, fontFamily: Typography.bold }}>
                {privacyMode ? '••••••' : formatBRL(totalAmount)}
              </Text>
            </Text>
          </View>

          {uncategorizedTransactions.length > 0 && (
            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                },
              ]}
            >
              <AlertCircle size={12} color="#F59E0B" />
              <Text style={styles.statusTagText}>Requer Ação</Text>
            </View>
          )}
        </View>

        {/* Conteúdo Principal */}
        {uncategorizedTransactions.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.helperInstruction, { color: colors.textSecondary }]}>
              Selecione uma categoria para cada movimentação abaixo:
            </Text>

            <View style={styles.cardList}>
              {uncategorizedTransactions.map((tx) => {
                const { cleanName, installment } = parseMerchantAndInstallments(
                  tx.merchant,
                  tx.rawText
                );
                const card = cards.find((c) => c.id === tx.cardId);
                const isFading = recentlyCategorizedId === tx.id;

                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isFading ? colors.primary : colors.borderSubtle,
                        opacity: isFading ? 0.4 : 1,
                      },
                    ]}
                  >
                    {/* Linha Superior da Transação: Nome e Valor */}
                    <View style={styles.txTopRow}>
                      <View style={styles.txNameContainer}>
                        <Text
                          numberOfLines={1}
                          style={[styles.txMerchantName, { color: colors.text }]}
                        >
                          {cleanName}
                        </Text>
                        <View style={styles.txMetaRow}>
                          <Calendar size={11} color={colors.textMuted} />
                          <Text style={[styles.txMetaText, { color: colors.textMuted }]}>
                            {formatDate(tx.timestamp)}
                          </Text>
                          {card && (
                            <>
                              <Text style={[styles.txMetaDot, { color: colors.textMuted }]}>•</Text>
                              <CreditCard size={11} color={colors.textMuted} />
                              <Text style={[styles.txMetaText, { color: colors.textMuted }]}>
                                {card.bankName} (•••• {card.lastFourDigits})
                              </Text>
                            </>
                          )}
                          {installment && (
                            <>
                              <Text style={[styles.txMetaDot, { color: colors.textMuted }]}>•</Text>
                              <Text style={[styles.txMetaText, { color: colors.primary }]}>
                                {installment.current}/{installment.total}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      <Text style={[styles.txAmountText, { color: colors.text }]}>
                        {privacyMode ? '••••••' : formatBRL(tx.amount)}
                      </Text>
                    </View>

                    {/* Divisor */}
                    <View
                      style={[
                        styles.cardDivider,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
                      ]}
                    />

                    {/* Chips de Escolha Rápida de Categoria */}
                    <Text style={[styles.chooseLabel, { color: colors.textMuted }]}>
                      DEFINIR COMO:
                    </Text>

                    <View style={styles.categoryChipsGrid}>
                      {selectableCategories.map((cat) => {
                        const IconComponent = getCategoryIconComponent(cat.icon);

                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => handleCategorize(tx.id, cat.id)}
                            hitSlop={8}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Categorizar como ${cat.name}`}
                            style={({ pressed }) => [
                              styles.categoryChip,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.04)'
                                  : 'rgba(0, 0, 0, 0.03)',
                                borderColor: colors.borderSubtle,
                                transform: [{ scale: pressed ? 0.95 : 1 }],
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.chipIconCircle,
                                { backgroundColor: `${cat.color}22` },
                              ]}
                            >
                              <IconComponent size={13} color={cat.color} />
                            </View>
                            <Text
                              numberOfLines={1}
                              style={[styles.chipText, { color: colors.text }]}
                            >
                              {cat.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          /* Estado Vazio de Sucesso: Tudo 100% Categorizado */
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                },
              ]}
            >
              <CheckCircle2 size={44} color="#10B981" />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Tudo Categorizado!
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Parabéns! Você não possui nenhuma transação pendente de categoria. Seus tetos e
              gráficos de desempenho estão 100% calibrados.
            </Text>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text style={[styles.backBtnText, { color: colors.primaryForeground }]}>
                VOLTAR AO INÍCIO
              </Text>
            </Pressable>
          </View>
        )}

        {/* Barra Inferior com Gesto de Arrastar para Fechar */}
        <ModalBottomHandle
          panHandlers={handlePanResponder.panHandlers}
          color={colors.borderStrong}
        />
      </SafeAreaView>
    </Animated.View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenEyebrow: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: Typography.bold,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statusLeft: {
    gap: 2,
  },
  statusCountText: {
    fontSize: 15,
    fontFamily: Typography.bold,
  },
  statusTotalText: {
    fontSize: 12,
    fontFamily: Typography.regular,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontFamily: Typography.bold,
    color: '#F59E0B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  helperInstruction: {
    fontSize: 12,
    fontFamily: Typography.regular,
    marginBottom: 14,
  },
  cardList: {
    gap: 14,
  },
  txCard: {
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  txNameContainer: {
    flex: 1,
  },
  txMerchantName: {
    fontSize: 15,
    fontFamily: Typography.bold,
    marginBottom: 4,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  txMetaText: {
    fontSize: 11,
    fontFamily: Typography.regular,
  },
  txMetaDot: {
    fontSize: 11,
  },
  txAmountText: {
    fontSize: 15,
    fontFamily: Typography.bold,
    textAlign: 'right',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  chooseLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Typography.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  backBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: Typography.bold,
    letterSpacing: 0.5,
  },
});
