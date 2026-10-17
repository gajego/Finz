import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { X, Check, CreditCard, ShieldCheck } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_BANKS = [
  { name: 'Nubank', package: 'com.nu.production', gradient: ['#820AD1', '#4C0677'] as [string, string], color: '#820AD1' },
  { name: 'Itaú', package: 'com.itau', gradient: ['#EC7000', '#1C1917'] as [string, string], color: '#EC7000' },
  { name: 'Banco Inter', package: 'br.com.intermedium', gradient: ['#FF7A00', '#D95A00'] as [string, string], color: '#FF7A00' },
  { name: 'Bradesco', package: 'com.bancobradesco', gradient: ['#CC092F', '#7A041A'] as [string, string], color: '#CC092F' },
  { name: 'C6 Bank', package: 'com.c6bank.app', gradient: ['#1C1C1E', '#000000'] as [string, string], color: '#1C1C1E' },
  { name: 'Mercado Pago', package: 'com.mercadopago.wallet', gradient: ['#009EE3', '#005E8A'] as [string, string], color: '#009EE3' },
];

export const AddCardModal: React.FC<AddCardModalProps> = ({ visible, onClose }) => {
  const { colors, mode } = useTheme();
  const addCard = useWalletStore((s) => s.addCard);
  const profile = useWalletStore((s) => s.profile);

  const [selectedBank, setSelectedBank] = useState(PRESET_BANKS[0]);
  const [lastFour, setLastFour] = useState('1234');
  const [limitStr, setLimitStr] = useState('5000');

  const handleSave = () => {
    const limitCents = Math.round((parseFloat(limitStr) || 0) * 100);
    addCard({
      bankName: selectedBank.name.toUpperCase(),
      packageName: selectedBank.package,
      lastFourDigits: lastFour.trim() || '0000',
      gradient: selectedBank.gradient,
      accentColor: selectedBank.color,
      cardholderName: (profile.fullName || profile.nickname || 'MEU CARTAO').toUpperCase(),
      balance: 0,
      limit: limitCents,
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
          {/* Topo */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <CreditCard size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>NOVO CARTÃO</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>VINCULAR BANCO</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          {/* Selecionar Banco */}
          <Text style={[styles.label, { color: colors.textMuted }]}>SELECIONE SUA INSTITUIÇÃO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankPills}>
            {PRESET_BANKS.map((b) => {
              const isSelected = selectedBank.name === b.name;
              return (
                <Pressable
                  key={b.name}
                  onPress={() => setSelectedBank(b)}
                  style={[
                    styles.bankPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bankPillText,
                      { color: isSelected ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Campos */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>ÚLTIMOS 4 DÍGITOS DO CARTÃO</Text>
            <TextInput
              value={lastFour}
              onChangeText={setLastFour}
              maxLength={4}
              keyboardType="numeric"
              placeholder="Ex: 8492"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>LIMITE TOTAL DISPONÍVEL (R$)</Text>
            <TextInput
              value={limitStr}
              onChangeText={setLimitStr}
              keyboardType="numeric"
              placeholder="Ex: 5000"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          {/* Botão de Salvar */}
          <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Check size={16} color={colors.primaryForeground} />
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              SALVAR E VINCULAR CARTÃO
            </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 8,
  },
  bankPills: {
    gap: 8,
    paddingBottom: 16,
  },
  bankPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  bankPillText: {
    fontFamily: Typography.bold,
    fontSize: 11,
  },
  inputGroup: {
    marginBottom: 14,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Typography.bold,
    fontVariant: ['tabular-nums'],
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
});
