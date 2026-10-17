import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { Bell, X, Zap, ArrowDownRight } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

interface NotificationSimulatorProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_PUSHES = [
  {
    bankName: 'Nubank',
    cardId: 'card_nu',
    text: 'Compra de R$ 42,90 aprovada no Uber Brasil',
    amount: 4290,
    merchant: 'Uber Brasil',
    categoryId: 'cat_transport',
    type: 'EXPENSE' as const,
  },
  {
    bankName: 'Itaú',
    cardId: 'card_itau',
    text: 'Compra aprovada de R$ 135,00 em Outback Steakhouse',
    amount: 13500,
    merchant: 'Outback Steakhouse',
    categoryId: 'cat_food',
    type: 'EXPENSE' as const,
  },
  {
    bankName: 'Banco Inter',
    cardId: 'card_inter',
    text: 'Estorno aprovado de R$ 68,00 em Amazon Marketplace',
    amount: 6800,
    merchant: 'Amazon Marketplace (Estorno)',
    categoryId: 'cat_shopping',
    type: 'REFUND' as const,
  },
];

export const NotificationSimulatorModal: React.FC<NotificationSimulatorProps> = ({
  visible,
  onClose,
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
                <Zap size={16} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Simulador de Notificação</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.borderLight }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Teste como o aplicativo captura as notificações de bancos em segundo plano e adiciona automaticamente ao extrato:
          </Text>

          <View style={styles.presetsList}>
            {PRESET_PUSHES.map((push, index) => (
              <Pressable
                key={index}
                onPress={() => handleSimulate(push)}
                style={[
                  styles.pushCard,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.pushTop}>
                  <Text style={[styles.pushBank, { color: colors.primary }]}>{push.bankName}</Text>
                  <Text style={[styles.pushTime, { color: colors.textMuted }]}>Agora</Text>
                </View>
                <Text style={[styles.pushText, { color: colors.text }]}>{push.text}</Text>
                <Text style={[styles.pushAction, { color: colors.secondary }]}>
                  Toque para simular disparo ⚡
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  presetsList: {
    gap: 12,
  },
  pushCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  pushTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pushBank: {
    fontSize: 12,
    fontWeight: '700',
  },
  pushTime: {
    fontSize: 11,
  },
  pushText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pushAction: {
    fontSize: 12,
    fontWeight: '700',
  },
});
