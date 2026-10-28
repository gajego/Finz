import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Switch,
} from 'react-native';
import {
  useSwipeModalDismiss,
  ModalTopHandle,
  ModalBottomHandle,
} from '@/components/ui/SwipeableModalSheet';
import {
  X,
  Check,
  Trash2,
  Lock,
  Sparkles,
  Sliders,
  DollarSign,
  Palette,
  Layers,
  PieChart,
  EyeOff,
} from 'lucide-react-native';
import { Category } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import {
  CATEGORY_ICON_LIST,
  CATEGORY_PALETTE,
  getCategoryIconComponent,
} from './categoryIcons';

interface CategoryModalProps {
  visible: boolean;
  categoryToEdit?: Category | null;
  onClose: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  categoryToEdit,
  onClose,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const createCategory = useWalletStore((s) => s.createCategory);
  const updateCategory = useWalletStore((s) => s.updateCategory);
  const deleteCategory = useWalletStore((s) => s.deleteCategory);

  const isEditing = !!categoryToEdit;
  const isProtected = categoryToEdit?.id === 'cat_others';

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_PALETTE[0]);
  const [budgetLimitStr, setBudgetLimitStr] = useState('');
  const [considerar, setConsiderar] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setSelectedIcon(categoryToEdit.icon);
        setSelectedColor(categoryToEdit.color);
        setBudgetLimitStr(
          categoryToEdit.budgetLimit > 0
            ? (categoryToEdit.budgetLimit / 100).toString()
            : ''
        );
        setConsiderar(categoryToEdit.considerar !== false);
      } else {
        setName('');
        setSelectedIcon('tag');
        setSelectedColor(CATEGORY_PALETTE[Math.floor(Math.random() * 6)]);
        setBudgetLimitStr('');
        setConsiderar(true);
      }
      setErrorMessage(null);
    }
  }, [visible, categoryToEdit]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Por favor, informe o nome da categoria.');
      return;
    }

    if (isProtected) {
      setErrorMessage('A categoria "Não categorizado" é protegida pelo sistema.');
      return;
    }

    const cleanBudgetStr = budgetLimitStr.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsedReais = parseFloat(cleanBudgetStr);
    const budgetLimitCents = Number.isFinite(parsedReais) && parsedReais > 0
      ? Math.round(parsedReais * 100)
      : 0;

    if (isEditing && categoryToEdit) {
      updateCategory(categoryToEdit.id, {
        name: trimmed,
        icon: selectedIcon,
        color: selectedColor,
        budgetLimit: budgetLimitCents,
        considerar,
      });
    } else {
      createCategory({
        name: trimmed,
        icon: selectedIcon,
        color: selectedColor,
        budgetLimit: budgetLimitCents,
        considerar,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (!categoryToEdit || isProtected) return;

    Alert.alert(
      'Excluir Categoria',
      `Tem certeza que deseja excluir "${categoryToEdit.name}"?\n\nTodas as movimentações associadas serão mantidas e transferidas para "Não categorizado".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteCategory(categoryToEdit.id);
            onClose();
          },
        },
      ]
    );
  };

  const PreviewIcon = getCategoryIconComponent(selectedIcon);

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdropArea} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderStrong,
            },
            animatedSheetStyle,
          ]}
        >
          {/* Barra de Arraste Superior com Gesto de Arrastar para Fechar */}
          <ModalTopHandle
            panHandlers={handlePanResponder.panHandlers}
            color={colors.border}
          />

          <View {...headerPanResponder.panHandlers} style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isEditing ? 'EDITAR CATEGORIA' : 'NOVA CATEGORIA'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isEditing
                  ? 'Personalize o nome, ícone e teto orçamentário'
                  : 'Crie uma nova categoria para organizar suas movimentações'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              hitSlop={8}
            >
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          {isProtected && (
            <View
              style={[
                styles.protectedBanner,
                {
                  backgroundColor: isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.08)',
                  borderColor: isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.2)',
                },
              ]}
            >
              <Lock size={14} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={[styles.protectedBannerText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                Esta é a categoria padrão do sistema. Suas propriedades são protegidas e ela não pode ser excluída.
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollFlex}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Live Preview Neo-Fintech Card */}
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.previewIconBox,
                  {
                    backgroundColor: `${selectedColor}18`,
                    borderColor: `${selectedColor}40`,
                  },
                ]}
              >
                <PreviewIcon size={24} color={selectedColor} />
              </View>

              <View style={styles.previewInfo}>
                <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
                  PREVIEW EM TEMPO REAL
                </Text>
                <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
                  {name.trim() || 'Nome da Categoria'}
                </Text>
                <Text style={[styles.previewBudget, { color: colors.textSecondary }]}>
                  {budgetLimitStr ? `Teto mensal: R$ ${budgetLimitStr}` : 'Sem teto definido'}
                </Text>
              </View>
            </View>

            {/* Campo 1: Nome da Categoria */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                NOME DA CATEGORIA
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                    borderColor: errorMessage ? colors.danger : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Ex: Assinaturas, Cursos, Pets..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!isProtected}
                maxLength={30}
              />
              {errorMessage && (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {errorMessage}
                </Text>
              )}
            </View>

            {/* Campo 2: Cor da Categoria */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Palette size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  COR DA CATEGORIA
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorPaletteRow}
              >
                {CATEGORY_PALETTE.map((color) => {
                  const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
                  return (
                    <Pressable
                      key={color}
                      onPress={() => !isProtected && setSelectedColor(color)}
                      disabled={isProtected}
                      style={[
                        styles.colorCircle,
                        {
                          backgroundColor: color,
                          borderColor: isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.2)',
                          transform: [{ scale: isSelected ? 1.15 : 1 }],
                        },
                      ]}
                      hitSlop={6}
                    >
                      {isSelected && <Check size={14} color="#000000" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Campo 3: Teto Orçamentário Mensal (Opcional) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Sliders size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  TETO MENSAL (OPCIONAL)
                </Text>
              </View>

              <View
                style={[
                  styles.budgetInputContainer,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>R$</Text>
                <TextInput
                  style={[styles.budgetInput, { color: colors.text }]}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={budgetLimitStr}
                  onChangeText={setBudgetLimitStr}
                  editable={!isProtected}
                />
              </View>

              <View style={styles.quickValuesRow}>
                {[100, 300, 500, 1000].map((val) => (
                  <Pressable
                    key={val}
                    onPress={() => !isProtected && setBudgetLimitStr(val.toString())}
                    disabled={isProtected}
                    style={[
                      styles.quickValueChip,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text style={[styles.quickValueText, { color: colors.textSecondary }]}>
                      +R$ {val}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => !isProtected && setBudgetLimitStr('')}
                  disabled={isProtected}
                  style={[
                    styles.quickValueChip,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.quickValueText, { color: colors.textMuted }]}>
                    Sem teto
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Campo 4: Considerar nos Totais e Gráficos */}
            <View
              style={[
                styles.toggleCard,
                {
                  backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.toggleCardText}>
                <View style={styles.toggleTitleRow}>
                  {considerar ? (
                    <PieChart size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  ) : (
                    <EyeOff size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>
                    Considerar nos totais e gráficos
                  </Text>
                </View>
                <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                  {considerar
                    ? 'Os gastos desta categoria entram na soma total do mês e aparecem nos gráficos.'
                    : 'Os gastos desta categoria NÃO entram nos totais gerais nem aparecem nos gráficos.'}
                </Text>
              </View>
              <Switch
                value={considerar}
                onValueChange={setConsiderar}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (considerar ? '#FFFFFF' : '#F4F3F4') : undefined}
                disabled={isProtected}
              />
            </View>

            {/* Campo 5: Seletor de Ícones (40 Ícones Lucide) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Layers size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  ÍCONE VETORIAL ({CATEGORY_ICON_LIST.length} OPÇÕES)
                </Text>
              </View>

              <View style={styles.iconGrid}>
                {CATEGORY_ICON_LIST.map((item) => {
                  const isSelected = selectedIcon.toLowerCase() === item.id.toLowerCase();
                  const IconComp = item.Icon;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => !isProtected && setSelectedIcon(item.id)}
                      disabled={isProtected}
                      style={[
                        styles.iconGridItem,
                        {
                          backgroundColor: isSelected
                            ? `${selectedColor}22`
                            : isDark
                            ? colors.surface
                            : colors.surfaceElevated,
                          borderColor: isSelected ? selectedColor : colors.borderSubtle,
                        },
                      ]}
                    >
                      <IconComp
                        size={18}
                        color={isSelected ? selectedColor : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.iconGridItemLabel,
                          {
                            color: isSelected ? selectedColor : colors.textMuted,
                            fontFamily: isSelected ? Typography.bold : Typography.regular,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Dock de Ações Fixada na Base */}
          <View
            style={[
              styles.pinnedFooter,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderTopColor: colors.borderSubtle,
              },
            ]}
          >
            {!isProtected ? (
              <>
                <Pressable
                  onPress={handleSave}
                  style={({ pressed }) => [
                    styles.saveButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <Check size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
                    {isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR CATEGORIA'}
                  </Text>
                </Pressable>

                {isEditing && (
                  <Pressable
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Trash2 size={15} color={colors.danger} style={{ marginRight: 6 }} />
                    <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                      EXCLUIR CATEGORIA
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeProtectedButton,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.closeProtectedButtonText, { color: colors.textSecondary }]}>
                  FECHAR
                </Text>
              </Pressable>
            )}
          </View>

          {/* Barra Inferior com Gesto de Arrastar para Fechar */}
          <ModalBottomHandle
            panHandlers={handlePanResponder.panHandlers}
            color={colors.border}
          />
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
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 8,
  },
  topHandleBar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  protectedBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  protectedBannerText: {
    flex: 1,
    fontFamily: Typography.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 28,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  previewIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  previewName: {
    fontFamily: Typography.bold,
    fontSize: 15,
  },
  previewBudget: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: Typography.medium,
    fontSize: 14,
    marginTop: 6,
  },
  errorText: {
    fontFamily: Typography.regular,
    fontSize: 11,
    marginTop: 4,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconGridItem: {
    width: '22.8%',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  iconGridItemLabel: {
    fontSize: 9,
    marginTop: 3,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontFamily: Typography.bold,
    fontSize: 14,
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    fontFamily: Typography.bold,
    fontSize: 15,
  },
  quickValuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickValueChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickValueText: {
    fontFamily: Typography.medium,
    fontSize: 10,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  toggleCardText: {
    flex: 1,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleTitle: {
    fontFamily: Typography.bold,
    fontSize: 13,
  },
  toggleDescription: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  pinnedFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    gap: 8,
  },
  saveButton: {
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  deleteButton: {
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  closeProtectedButton: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeProtectedButtonText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
