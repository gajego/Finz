import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
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

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleConfirm = () => {
    addTransaction({
      cardId: matchedCard.id,
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
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.borderStrong,
            },
          ]}
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
                {receipt.bankName} ({matchedCard.bankName})
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 14,
    gap: 10,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  confirmBtn: {
    height: 50,
    borderRadius: 12,
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
