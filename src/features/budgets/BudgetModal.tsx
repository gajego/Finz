import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { X, Check, Sliders, AlertTriangle } from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Category } from '@/types';

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategoryId?: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  visible,
  onClose,
  initialCategoryId,
}) => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const updateCategoryBudget = useWalletStore((s) => s.updateCategoryBudget);

  const [selectedCatId, setSelectedCatId] = useState<string>(
    initialCategoryId || categories[0]?.id || ''
  );

  const activeCategory =
    categories.find((c) => c.id === selectedCatId) || categories[0];

  const currentSpent = transactions
    .filter((t) => t.categoryId === activeCategory?.id && t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const [inputReais, setInputReais] = useState<string>(
    ((activeCategory?.budgetLimit || 0) / 100).toString()
  );

  const handleSelectCategory = (cat: Category) => {
    setSelectedCatId(cat.id);
    setInputReais((cat.budgetLimit / 100).toString());
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(inputReais) || 0;
    setInputReais((current + amount).toString());
  };

  const handleSave = () => {
    const value = parseFloat(inputReais) || 0;
    const cents = Math.round(value * 100);
    if (activeCategory) {
      updateCategoryBudget(activeCategory.id, cents);
    }
    onClose();
  };

  const currentLimitCents = (parseFloat(inputReais) || 1) * 100;
  const currentPercent = Math.min(Math.round((currentSpent / currentLimitCents) * 100), 200);
  const isAlertThreshold = currentPercent >= 85;

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
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
              <View style={styles.titleBadge}>
                <Sliders size={13} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>GESTÃO DE METAS</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>TETO DE GASTOS MENSAL</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          {/* Seletor de Categoria */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
            {categories.map((cat) => {
              const isSelected = cat.id === activeCategory?.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleSelectCategory(cat)}
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

          {/* Campo de Valor */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              QUANTO VOCÊ DESEJA GASTAR EM {activeCategory?.name.toUpperCase()} POR MÊS?
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                  borderColor: isAlertThreshold ? '#FF3B30' : colors.border,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>R$</Text>
              <TextInput
                value={inputReais}
                onChangeText={setInputReais}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text }]}
              />
            </View>

            {/* Botoes de incremento rapido */}
            <View style={styles.quickAddRow}>
              {[100, 250, 500, 1000].map((val) => (
                <Pressable
                  key={val}
                  onPress={() => handleQuickAdd(val)}
                  style={[styles.quickAddBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                >
                  <Text style={[styles.quickAddText, { color: colors.text }]}>+ R$ {val}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Indicador de Consumo Atual e Alerta Vermelho */}
          <View
            style={[
              styles.previewBox,
              isAlertThreshold ? styles.previewBoxWarning : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          >
            <View style={styles.previewTop}>
              <View style={styles.previewTitleRow}>
                {isAlertThreshold && <AlertTriangle size={15} color="#FF3B30" />}
                <Text
                  style={[
                    styles.previewTitle,
                    { color: isAlertThreshold ? '#FF3B30' : colors.textSecondary },
                  ]}
                >
                  {isAlertThreshold ? 'ATENÇÃO: CONSUMO CRÍTICO' : 'STATUS DO CONSUMO'}
                </Text>
              </View>
              <Text
                style={[
                  styles.previewPercent,
                  { color: isAlertThreshold ? '#FF3B30' : colors.primary },
                ]}
              >
                {currentPercent}%
              </Text>
            </View>

            <View style={[styles.track, { backgroundColor: colors.surfaceElevated }]}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.min(currentPercent, 100)}%`,
                    backgroundColor: isAlertThreshold ? '#FF3B30' : colors.primary,
                  },
                ]}
              />
            </View>

            <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
              Você já gastou {formatBRL(currentSpent)} nesta categoria.
            </Text>
          </View>

          {/* Botão Salvar */}
          <Pressable onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.primary }]}>
            <Check size={16} color={colors.primaryForeground} />
            <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
              SALVAR TETO MENSAL
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
    marginBottom: 18,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPills: {
    gap: 8,
    paddingBottom: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputSection: {
    marginVertical: 10,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 6,
  },
  numericInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 14,
  },
  previewBoxWarning: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderColor: '#FF3B30',
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  previewPercent: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
  previewDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
