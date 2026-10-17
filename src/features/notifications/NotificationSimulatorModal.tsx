import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { X, Zap, AlertTriangle } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';

interface NotificationSimulatorProps {
  visible: boolean;
  onClose: () => void;
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
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.surfaceSubtle }]}>
                <Zap size={16} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>TERMINAL DE NOTIFICAÇÕES</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Dispare um evento simulado de banco para testar a captura automática e o disparo de alertas vermelhos de meta:
          </Text>

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
                  <Text style={[styles.pushBank, { color: push.isWarningTrigger ? '#FF3B30' : colors.primary }]}>
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
                <Text style={[styles.pushAction, { color: push.isWarningTrigger ? '#FF3B30' : colors.secondary }]}>
                  Toque para simular recebimento ⚡
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  presetsList: {
    gap: 10,
  },
  pushCard: {
    padding: 16,
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
    fontSize: 11,
    fontWeight: '800',
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
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pushTime: {
    fontSize: 11,
  },
  pushText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  pushAction: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
