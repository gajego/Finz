import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Calendar,
  Tag,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, Radii } from '@/theme/typography';
import { TransactionType } from '@/types';
import { formatBRL, getBrazilDateParts } from './transactionUtils';
import { getCategoryIconComponent } from '@/features/categories/categoryIcons';
import { useSwipeModalDismiss, ModalTopHandle } from '@/components/ui/SwipeableModalSheet';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
}

type DateOption = 'today' | 'yesterday' | 'custom';

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const cards = useWalletStore((s) => s.cards);
  const categories = useWalletStore((s) => s.categories);
  const addTransaction = useWalletStore((s) => s.addTransaction);

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountCents, setAmountCents] = useState<number>(0);
  const [merchant, setMerchant] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || 'cat_food'
  );
  const [selectedCardId, setSelectedCardId] = useState<string>(
    cards[0]?.id || ''
  );
  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [customDateStr, setCustomDateStr] = useState<string>(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  // Reset do formulário ao abrir
  React.useEffect(() => {
    if (visible) {
      setAmountCents(0);
      setMerchant('');
      setType('EXPENSE');
      setSelectedCategoryId(categories[0]?.id || 'cat_food');
      setSelectedCardId(cards[0]?.id || '');
      setDateOption('today');
      setErrorMsg(null);
    }
  }, [visible, categories, cards]);

  const handleAmountChange = (text: string) => {
    const cleanNumbers = text.replace(/\D/g, '');
    const num = parseInt(cleanNumbers, 10);
    setAmountCents(isNaN(num) ? 0 : num);
  };

  const handleSave = () => {
    if (amountCents <= 0) {
      setErrorMsg('Informe um valor maior que zero');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Informe o estabelecimento ou descrição');
      return;
    }

    // Determina o timestamp da transação
    let txTimestamp = Date.now();
    const now = new Date();
    if (dateOption === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      txTimestamp = yesterday.getTime();
    } else if (dateOption === 'custom') {
      const parts = customDateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const customDate = new Date(year, month, day, 12, 0, 0);
        if (!isNaN(customDate.getTime())) {
          txTimestamp = customDate.getTime();
        }
      }
    }

    // Salva explicitamente com flag isManual = true
    addTransaction({
      amount: amountCents,
      merchant: merchant.trim(),
      type,
      categoryId: selectedCategoryId || 'cat_others',
      cardId: selectedCardId || (cards[0]?.id ?? 'manual_card'),
      timestamp: txTimestamp,
      isManual: true,
      rawText: `manual:${merchant.trim()}`,
    });

    onClose();
  };

  const typeOptions: { type: TransactionType; label: string; icon: typeof ArrowUpRight }[] = [
    { type: 'EXPENSE', label: 'Despesa', icon: CreditCard },
    { type: 'PIX_OUT', label: 'Pix Envio', icon: ArrowUpRight },
    { type: 'INCOME', label: 'Receita', icon: ArrowDownLeft },
    { type: 'PIX_IN', label: 'Pix Recebido', icon: ArrowDownLeft },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdropArea} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
              borderColor: colors.borderStrong,
            },
            animatedSheetStyle,
          ]}
        >
          <ModalTopHandle
            panHandlers={handlePanResponder.panHandlers}
            color={colors.borderStrong}
          />

          {/* Header */}
          <View
            {...headerPanResponder.panHandlers}
            style={[styles.headerBar, { borderBottomColor: colors.borderSubtle }]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}33` },
                ]}
              >
                <Plus size={16} color={colors.primary} strokeWidth={2.4} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Nova Transação Manual
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {errorMsg && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: colors.dangerSubtle, borderColor: colors.danger },
                ]}
              >
                <AlertCircle size={15} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
              </View>
            )}

            {/* Seletor de Tipo */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              TIPO DE MOVIMENTAÇÃO
            </Text>
            <View style={styles.typeSelectorRow}>
              {typeOptions.map((opt) => {
                const isSelected = type === opt.type;
                const IconComp = opt.icon;
                return (
                  <Pressable
                    key={opt.type}
                    onPress={() => {
                      setType(opt.type);
                      setErrorMsg(null);
                    }}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isSelected
                          ? `${colors.primary}20`
                          : isDark
                          ? colors.surfaceElevated
                          : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <IconComp
                      size={14}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        {
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontFamily: isSelected ? Typography.bold : Typography.medium,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Input de Valor */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              VALOR
            </Text>
            <View
              style={[
                styles.amountInputContainer,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: amountCents > 0 ? colors.primary : colors.borderSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.amountCurrencyPrefix,
                  { color: type === 'INCOME' || type === 'PIX_IN' ? colors.success : colors.danger },
                ]}
              >
                {type === 'INCOME' || type === 'PIX_IN' ? '+ R$' : '- R$'}
              </Text>
              <TextInput
                style={[styles.amountTextInput, { color: colors.text }]}
                value={amountCents > 0 ? (amountCents / 100).toFixed(2).replace('.', ',') : '0,00'}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                selectTextOnFocus
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Descrição / Estabelecimento */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              ESTABELECIMENTO / DESCRIÇÃO
            </Text>
            <View
              style={[
                styles.textInputContainer,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Ex: Supermercado Pão de Açúcar, Uber, Salário..."
                placeholderTextColor={colors.textMuted}
                value={merchant}
                onChangeText={(t) => {
                  setMerchant(t);
                  setErrorMsg(null);
                }}
              />
            </View>

            {/* Categoria */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              CATEGORIA
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const IconComponent = getCategoryIconComponent(cat.icon);
                const catColor = cat.color || colors.primary;

                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected
                          ? `${catColor}25`
                          : isDark
                          ? colors.surfaceElevated
                          : colors.surfaceSubtle,
                        borderColor: isSelected ? catColor : colors.borderSubtle,
                      },
                    ]}
                  >
                    <IconComponent size={14} color={isSelected ? catColor : colors.textSecondary} />
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: isSelected ? colors.text : colors.textSecondary,
                          fontFamily: isSelected ? Typography.bold : Typography.regular,
                        },
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {isSelected && <Check size={12} color={catColor} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Cartão / Conta de Origem */}
            {cards.length > 0 && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                  CARTÃO / CONTA VINCULADA
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {cards.map((c) => {
                    const isSelected = selectedCardId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setSelectedCardId(c.id)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? `${colors.primary}22`
                              : isDark
                              ? colors.surfaceElevated
                              : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                      >
                        <CreditCard
                          size={14}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            {
                              color: isSelected ? colors.text : colors.textSecondary,
                              fontFamily: isSelected ? Typography.bold : Typography.regular,
                            },
                          ]}
                        >
                          {c.bankName} (•••• {c.lastFourDigits})
                        </Text>
                        {isSelected && <Check size={12} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Data da Transação */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              DATA DO LANÇAMENTO
            </Text>
            <View style={styles.dateSelectorRow}>
              {(['today', 'yesterday', 'custom'] as DateOption[]).map((opt) => {
                const isSelected = dateOption === opt;
                const label = opt === 'today' ? 'Hoje' : opt === 'yesterday' ? 'Ontem' : 'Outra Data';
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setDateOption(opt)}
                    style={[
                      styles.dateButton,
                      {
                        backgroundColor: isSelected
                          ? `${colors.primary}20`
                          : isDark
                          ? colors.surfaceElevated
                          : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Calendar
                      size={13}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.dateButtonText,
                        {
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontFamily: isSelected ? Typography.bold : Typography.medium,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {dateOption === 'custom' && (
              <View
                style={[
                  styles.textInputContainer,
                  {
                    marginTop: 10,
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Clock size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textMuted}
                  value={customDateStr}
                  onChangeText={setCustomDateStr}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            )}

            {/* Aviso de Transação Manual */}
            <View
              style={[
                styles.manualNoticeBox,
                {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                },
              ]}
            >
              <Text style={[styles.manualNoticeText, { color: colors.textSecondary }]}>
                Esta movimentação é armazenada como <Text style={{ color: colors.primary, fontFamily: Typography.bold }}>Manual</Text> no banco de dados e ficará visível em seus gráficos, relatórios e calendário.
              </Text>
            </View>

            {/* Botão Salvar */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <Check size={18} color="#000000" strokeWidth={2.6} style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>Adicionar Transação</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdropArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Typography.bold,
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  amountCurrencyPrefix: {
    fontSize: 20,
    fontFamily: Typography.bold,
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 24,
    fontFamily: Typography.bold,
    letterSpacing: -0.5,
    padding: 0,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.medium,
    padding: 0,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 12,
  },
  manualNoticeBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: 20,
  },
  manualNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Typography.regular,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radii.lg,
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: Typography.bold,
    color: '#000000',
    letterSpacing: -0.2,
  },
});
