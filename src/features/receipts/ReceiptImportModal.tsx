import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { CheckCircle2, ArrowRight, ShieldCheck, Tag } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { ParsedReceipt } from '@/services/receipts/receiptParser';

interface ReceiptImportModalProps {
  receipt: ParsedReceipt | null;
  visible: boolean;
  onClose: () => void;
}

export const ReceiptImportModal: React.FC<ReceiptImportModalProps> = ({
  receipt,
  visible,
  onClose,
}) => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const cards = useWalletStore((s) => s.cards);
  const addTransaction = useWalletStore((s) => s.addTransaction);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat_food');

  if (!receipt) return null;

  // Encontra o cartão correspondente ao banco detectado no comprovante
  const matchedCard =
    cards.find((c) => c.bankName.toLowerCase().includes(receipt.bankName.toLowerCase())) ||
    cards[0];

  const cardId = matchedCard?.id || 'card_pix';

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleConfirm = () => {
    addTransaction({
      cardId,
      amount: receipt.amount,
      type: receipt.type,
      merchant: `Pix: ${receipt.recipient}`,
      categoryId: selectedCategoryId,
      rawText: receipt.rawText,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Topo com Badge de Sucesso */}
              <View style={styles.header}>
                <View style={styles.badgeRow}>
                  <ShieldCheck size={14} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    COMPROVANTE IDENTIFICADO
                  </Text>
                </View>
                <Text style={[styles.title, { color: colors.text }]}>PIX IMPORTADO COM SUCESSO</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  O Finz leu os dados do seu comprovante localmente sem enviar nada para a internet.
                </Text>
              </View>

          {/* Card com Detalhes Extraídos do Comprovante */}
          <View
            style={[
              styles.receiptCard,
              {
                backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>VALOR DO PIX</Text>
              <Text style={[styles.detailAmount, { color: colors.text }]}>
                {formatBRL(receipt.amount)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>PAGO PARA</Text>
              <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                {receipt.recipient}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>BANCO DE ORIGEM</Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {receipt.bankName}{matchedCard ? ` (${matchedCard.bankName})` : ''}
              </Text>
            </View>
          </View>

          {/* Seletor Rápido de Categoria */}
          <View style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Tag size={12} color={colors.textMuted} />
              <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>
                CATEGORIA DO GASTO:
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: isSelected ? colors.primaryForeground : colors.text },
                      ]}
                    >
                      {cat.name.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

              {/* Botão de Confirmação */}
              <Pressable onPress={handleConfirm} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>
                  CONFIRMAR & SALVAR NO EXTRATO
                </Text>
                <ArrowRight size={16} color={colors.primaryForeground} />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  receiptCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginVertical: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  detailAmount: {
    fontFamily: Typography.bold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  detailValue: {
    fontFamily: Typography.bold,
    fontSize: 12,
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 2,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  categoryTitle: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  pillsRow: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
});
