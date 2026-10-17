import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { X, Zap, AlertTriangle, Share2 } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { parsePixReceipt, ParsedReceipt } from '@/services/receipts/receiptParser';

interface NotificationSimulatorProps {
  visible: boolean;
  onClose: () => void;
  onSimulateSharedReceipt: (receipt: ParsedReceipt) => void;
}

const PRESET_PUSHES = [
  {
    bankName: 'Nubank',
    cardId: 'card_black',
    text: 'Compra de R$ 520,00 aprovada no Fogo de Chão (Alimentação)',
    amount: 52000,
    merchant: 'Fogo de Chão Steakhouse',
    categoryId: 'cat_food',
    type: 'EXPENSE' as const,
    isWarningTrigger: true,
  },
  {
    bankName: 'Nubank',
    cardId: 'card_black',
    text: 'Compra de R$ 35,90 aprovada no Uber Brasil',
    amount: 3590,
    merchant: 'Uber Brasil',
    categoryId: 'cat_transport',
    type: 'EXPENSE' as const,
    isWarningTrigger: false,
  },
  {
    bankName: 'Itaú',
    cardId: 'card_itau',
    text: 'Estorno confirmado de R$ 140,00 em Amazon Prime',
    amount: 14000,
    merchant: 'Amazon Prime (Estorno)',
    categoryId: 'cat_shopping',
    type: 'REFUND' as const,
    isWarningTrigger: false,
  },
];

const PRESET_PIX_RECEIPTS = [
  {
    title: 'Comprovante Pix Nubank (R$ 85,00)',
    text: `Comprovante de Transferência Pix
Valor: R$ 85,00
Destinatário: Padaria e Confeitaria Bella Vista
Instituição: Nu Pagamentos S.A.
Data: 17/10/2026 às 15:42`,
  },
  {
    title: 'Comprovante Pix Itaú (R$ 195,50)',
    text: `Comprovante de Pagamento Pix
Valor pago: R$ 195,50
Pago a: Posto Shell Combustíveis Ltda
Banco: Itaú Unibanco S.A.
Autenticação: 8F92A-4B81C`,
  },
];

export const NotificationSimulatorModal: React.FC<NotificationSimulatorProps> = ({
  visible,
  onClose,
  onSimulateSharedReceipt,
}) => {
  const { colors, mode } = useTheme();
  const addTransaction = useWalletStore((s) => s.addTransaction);

  const handleSimulate = (push: (typeof PRESET_PUSHES)[0]) => {
    addTransaction({
      cardId: push.cardId,
      amount: push.amount,
      type: push.type,
      merchant: push.merchant,
      categoryId: push.categoryId,
      rawText: push.text,
    });
    onClose();
  };

  const handleSimulateShare = (rawText: string) => {
    const parsed = parsePixReceipt(rawText);
    if (parsed) {
      onClose();
      onSimulateSharedReceipt(parsed);
    }
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
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.surfaceSubtle }]}>
                <Zap size={16} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>TERMINAL DE TESTES</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Seção 1: Compartilhar Comprovante Pix (Share Sheet) */}
            <View style={styles.sectionTitleRow}>
              <Share2 size={13} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                COMPARTILHAMENTO DE COMPROVANTE PIX (SHARE SHEET)
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Simula o usuário tocando em "Compartilhar comprovante" no Nubank/Itaú e escolhendo o Finz:
            </Text>

            <View style={styles.presetsList}>
              {PRESET_PIX_RECEIPTS.map((receipt, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSimulateShare(receipt.text)}
                  style={[
                    styles.pushCard,
                    {
                      backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <View style={styles.pushTop}>
                    <Text style={[styles.pushBank, { color: colors.primary }]}>
                      {receipt.title}
                    </Text>
                    <View style={styles.shareBadge}>
                      <Share2 size={10} color={colors.primaryForeground} />
                      <Text style={[styles.shareBadgeText, { color: colors.primaryForeground }]}>
                        SIMULAR COMPARTILHAR
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.pushText, { color: colors.textSecondary }]}>
                    {receipt.text.split('\n').slice(0, 3).join(' • ')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Seção 2: Pushes em Background */}
            <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
              <Zap size={13} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                NOTIFICAÇÕES EM SEGUNDO PLANO (ANDROID LISTENER)
              </Text>
            </View>

            <View style={styles.presetsList}>
              {PRESET_PUSHES.map((push, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSimulate(push)}
                  style={[
                    styles.pushCard,
                    push.isWarningTrigger
                      ? styles.pushCardWarning
                      : {
                          backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  <View style={styles.pushTop}>
                    <Text
                      style={[
                        styles.pushBank,
                        { color: push.isWarningTrigger ? '#FF3B30' : colors.primary },
                      ]}
                    >
                      {push.bankName}
                    </Text>
                    {push.isWarningTrigger ? (
                      <View style={styles.triggerBadge}>
                        <AlertTriangle size={11} color="#FF3B30" />
                        <Text style={styles.triggerBadgeText}>DISPARA ALERTA VERMELHO</Text>
                      </View>
                    ) : (
                      <Text style={[styles.pushTime, { color: colors.textMuted }]}>Agora</Text>
                    )}
                  </View>
                  <Text style={[styles.pushText, { color: colors.text }]}>{push.text}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
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
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  presetsList: {
    gap: 10,
  },
  pushCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pushCardWarning: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: '#FF3B30',
  },
  pushTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pushBank: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  shareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D9F920',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  shareBadgeText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  triggerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  triggerBadgeText: {
    color: '#FF3B30',
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  pushTime: {
    fontFamily: Typography.regular,
    fontSize: 11,
  },
  pushText: {
    fontFamily: Typography.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
