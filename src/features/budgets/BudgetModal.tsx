import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {
  X,
  Check,
  Sliders,
  AlertTriangle,
  Utensils,
  Car,
  Gamepad2,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Coffee,
  HelpCircle,
  Tag,
  ShieldAlert,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { Category } from '@/types';
import {
  useSwipeModalDismiss,
  ModalTopHandle,
  ModalBottomHandle,
} from '@/components/ui/SwipeableModalSheet';

const getCategoryIcon = (iconName: string): LucideIcon => {
  switch (iconName?.toLowerCase()) {
    case 'utensils':
    case 'food':
    case 'alimentação':
      return Utensils;
    case 'car':
    case 'transport':
    case 'transporte':
      return Car;
    case 'gamepad-2':
    case 'gamepad':
    case 'leisure':
    case 'lazer & setup':
      return Gamepad2;
    case 'trending-up':
    case 'investimentos':
    case 'investing':
      return TrendingUp;
    case 'shopping-bag':
    case 'shopping':
    case 'compras':
      return ShoppingBag;
    case 'help-circle':
    case 'não categorizado':
    case 'outros':
      return HelpCircle;
    case 'coffee':
      return Coffee;
    case 'sparkles':
      return Sparkles;
    default:
      return Tag;
  }
};

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
  const [inputReais, setInputReais] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Animação de entrada e saída
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      const targetId = initialCategoryId || selectedCatId || categories[0]?.id;
      const cat = categories.find((c) => c.id === targetId) || categories[0];
      if (cat) {
        setSelectedCatId(cat.id);
        setInputReais(((cat.budgetLimit || 0) / 100).toString());
      }

      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialCategoryId]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const activeCategory =
    categories.find((c) => c.id === selectedCatId) || categories[0];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const currentSpent = transactions
    .filter(
      (t) =>
        t.categoryId === activeCategory?.id &&
        (t.type === 'EXPENSE' || t.type === 'PIX_OUT') &&
        t.timestamp >= startOfMonth &&
        t.timestamp <= endOfMonth
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCatId(cat.id);
    setInputReais(((cat.budgetLimit || 0) / 100).toString());
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(inputReais) || 0;
    setInputReais((current + amount).toString());
  };

  const handleSetPreset = (amount: number) => {
    setInputReais(amount.toString());
  };

  const handleSave = () => {
    const value = Math.max(0, parseFloat(inputReais) || 0);
    const cents = Math.round(value * 100);
    if (activeCategory) {
      updateCategoryBudget(activeCategory.id, cents);
    }
    handleClose();
  };

  const currentLimitCents = (parseFloat(inputReais) || 0) * 100;
  const hasLimit = currentLimitCents > 0;
  const currentPercent = hasLimit
    ? Math.round((currentSpent / currentLimitCents) * 100)
    : 0;

  const isCritical = hasLimit && currentPercent > 90;
  const isWarning = hasLimit && currentPercent >= 70 && currentPercent <= 90;
  const isSafe = hasLimit && currentPercent < 70;

  const remainingCents = currentLimitCents - currentSpent;

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const statusColor = isCritical
    ? colors.danger
    : isWarning
    ? colors.warning
    : isSafe
    ? colors.success
    : colors.textMuted;

  const statusBg = isCritical
    ? colors.dangerSubtle
    : isWarning
    ? colors.warningSubtle
    : isSafe
    ? colors.successSubtle
    : colors.surfaceSubtle;

  const {
    panY,
    handlePanResponder,
    headerPanResponder,
  } = useSwipeModalDismiss({ onClose: handleClose, visible });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          {/* Backdrop Animado com Dismiss */}
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          </Animated.View>

          {/* Bottom Sheet com Suporte a Slide, Fade e Gesto de Arraste */}
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
                borderColor: colors.borderStrong,
                opacity: fadeAnim,
                transform: [{ translateY: Animated.add(slideAnim, panY) }],
              },
            ]}
          >
            {/* Grabber visual com Gesto de Arrastar para Fechar */}
            <ModalTopHandle
              panHandlers={handlePanResponder.panHandlers}
              color={
                mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(0, 0, 0, 0.2)'
              }
            />

            {/* Cabeçalho Fixo do Modal com Gesto de Arraste */}
            <View {...headerPanResponder.panHandlers} style={styles.header}>
              <View>
                <View style={styles.titleBadge}>
                  <Sliders size={12} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    GESTÃO DE METAS
                  </Text>
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                  TETO DE GASTOS MENSAL
                </Text>
              </View>

              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
                hitSlop={8}
              >
                <X size={16} color={colors.text} />
              </Pressable>
            </View>

            {/* Conteúdo com ScrollView para suporte a teclados iOS/Android */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Seletor de Categoria com Ícones Lucide */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPills}
              >
                {categories.map((cat) => {
                  const isSelected = cat.id === activeCategory?.id;
                  const Icon = getCategoryIcon(cat.icon);
                  const iconColor = isSelected
                    ? colors.primaryForeground
                    : cat.color || colors.primary;

                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => handleSelectCategory(cat)}
                      style={({ pressed }) => [
                        styles.pill,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        },
                      ]}
                    >
                      <Icon size={13} color={iconColor} />
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color: isSelected
                              ? colors.primaryForeground
                              : colors.text,
                          },
                        ]}
                      >
                        {cat.name.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Seção do Input com Foco Luminoso */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  LIMITE MENSAL PARA {activeCategory?.name.toUpperCase() || 'CATEGORIA'}
                </Text>

                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor:
                        mode === 'dark' ? colors.background : colors.surface,
                      borderColor: isFocused
                        ? colors.primary
                        : isCritical
                        ? colors.danger
                        : colors.border,
                    },
                    isFocused && {
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: mode === 'dark' ? 0.45 : 0.2,
                      shadowRadius: 10,
                      elevation: 4,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.primary }]}>
                    R$
                  </Text>
                  <TextInput
                    value={inputReais}
                    onChangeText={setInputReais}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.numericInput, { color: colors.text }]}
                  />
                  {parseFloat(inputReais) > 0 && (
                    <Pressable
                      onPress={() => setInputReais('0')}
                      style={[
                        styles.clearBtn,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                      hitSlop={6}
                    >
                      <X size={12} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* Chips de Ajuste Rápido (+ R$ 100, + R$ 250, etc) */}
                <Text style={[styles.chipSectionLabel, { color: colors.textMuted }]}>
                  INCREMENTOS RÁPIDOS
                </Text>
                <View style={styles.quickAddRow}>
                  {[100, 250, 500, 1000].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => handleQuickAdd(val)}
                      style={({ pressed }) => [
                        styles.quickAddBtn,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                          transform: [{ scale: pressed ? 0.94 : 1 }],
                        },
                      ]}
                    >
                      <Text style={[styles.quickAddText, { color: colors.text }]}>
                        + R$ {val}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Chips de Valores Sugeridos */}
                <Text style={[styles.chipSectionLabel, { color: colors.textMuted }]}>
                  VALORES SUGERIDOS
                </Text>
                <View style={styles.presetsRow}>
                  {[300, 600, 1200, 2500].map((val) => {
                    const isCurrent = (parseFloat(inputReais) || 0) === val;
                    return (
                      <Pressable
                        key={val}
                        onPress={() => handleSetPreset(val)}
                        style={({ pressed }) => [
                          styles.presetBtn,
                          {
                            backgroundColor: isCurrent
                              ? `${colors.primary}20`
                              : colors.surfaceSubtle,
                            borderColor: isCurrent
                              ? colors.primary
                              : colors.border,
                            transform: [{ scale: pressed ? 0.94 : 1 }],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            {
                              color: isCurrent ? colors.primary : colors.textSecondary,
                            },
                          ]}
                        >
                          R$ {val}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Status em Tempo Real do Consumo */}
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: isCritical
                      ? mode === 'dark'
                        ? 'rgba(255, 59, 48, 0.08)'
                        : 'rgba(225, 29, 72, 0.05)'
                      : isWarning
                      ? mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.06)'
                        : 'rgba(217, 119, 6, 0.04)'
                      : colors.surfaceSubtle,
                    borderColor: isCritical
                      ? mode === 'dark'
                        ? 'rgba(255, 59, 48, 0.35)'
                        : 'rgba(225, 29, 72, 0.3)'
                      : isWarning
                      ? mode === 'dark'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(217, 119, 6, 0.25)'
                      : colors.border,
                  },
                ]}
              >
                <View style={styles.previewTop}>
                  <View style={styles.previewTitleRow}>
                    {isCritical ? (
                      <AlertTriangle size={15} color={colors.danger} />
                    ) : isWarning ? (
                      <ShieldAlert size={15} color={colors.warning} />
                    ) : (
                      <CheckCircle2 size={15} color={colors.success} />
                    )}
                    <Text
                      style={[
                        styles.previewTitle,
                        {
                          color: isCritical
                            ? colors.danger
                            : isWarning
                            ? colors.warning
                            : colors.text,
                        },
                      ]}
                    >
                      {isCritical
                        ? 'CONSUMO CRÍTICO'
                        : isWarning
                        ? 'ALERTA DE PROXIMIDADE'
                        : hasLimit
                        ? 'ORÇAMENTO SAUDÁVEL'
                        : 'SEM TETO DEFINIDO'}
                    </Text>
                  </View>

                  <View style={[styles.percentBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.previewPercent, { color: statusColor }]}>
                      {hasLimit ? `${currentPercent}%` : 'LIVRE'}
                    </Text>
                  </View>
                </View>

                {/* Barra de Progresso Arredondada (7px) */}
                <View
                  style={[
                    styles.track,
                    {
                      backgroundColor:
                        mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.06)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${Math.min(currentPercent, 100)}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>

                <View style={styles.previewDetailRow}>
                  <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                    Gasto no mês: <Text style={{ fontFamily: Typography.bold, color: colors.text }}>{formatBRL(currentSpent)}</Text>
                  </Text>
                  {hasLimit && (
                    <Text
                      style={[
                        styles.previewDetail,
                        {
                          color: remainingCents < 0 ? colors.danger : colors.textMuted,
                          fontFamily: Typography.medium,
                        },
                      ]}
                    >
                      {remainingCents >= 0
                        ? `Restam ${formatBRL(remainingCents)}`
                        : `Estourado por ${formatBRL(Math.abs(remainingCents))}`}
                    </Text>
                  )}
                </View>
              </View>

              {/* Botão de Confirmação com Estilo Arrojado Neo-Fintech */}
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: colors.primary,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Check size={18} color={colors.primaryForeground} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  SALVAR TETO MENSAL
                </Text>
              </Pressable>
            </ScrollView>

            {/* Barra Inferior com Gesto de Arrastar para Fechar */}
            <ModalBottomHandle
              panHandlers={handlePanResponder.panHandlers}
              color={
                mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(0, 0, 0, 0.2)'
              }
            />
          </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleBadge: {
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
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPills: {
    gap: 8,
    paddingBottom: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  inputSection: {
    marginVertical: 6,
  },
  inputLabel: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontFamily: Typography.bold,
    fontSize: 22,
    marginRight: 8,
  },
  numericInput: {
    flex: 1,
    fontFamily: Typography.bold,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSectionLabel: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 2,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickAddBtn: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  presetBtn: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  previewBox: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 12,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  previewPercent: {
    fontFamily: Typography.bold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  bar: {
    height: 7,
    borderRadius: 999,
  },
  previewDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewDetail: {
    fontFamily: Typography.regular,
    fontSize: 11,
  },
  saveButton: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
});
