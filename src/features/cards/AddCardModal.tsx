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
  CreditCard,
  Building2,
  User,
  Hash,
  Check,
  AlertCircle,
  Sparkles,
  Palette,
} from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, Radii } from '@/theme/typography';
import { BankCard } from '@/types';
import { formatBRL } from '@/features/transactions/transactionUtils';
import { useSwipeModalDismiss, ModalTopHandle } from '@/components/ui/SwipeableModalSheet';

function darkenColor(hex: string, amount: number = 40): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return '#0F172A';
  const num = parseInt(clean, 16);
  if (isNaN(num)) return '#0F172A';
  const r = Math.max(0, Math.min(255, (num >> 16) - amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) - amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const CUSTOM_SWATCHES = [
  '#10B981', // Verde Esmeralda
  '#06B6D4', // Ciano Neon
  '#3B82F6', // Azul Royal
  '#6366F1', // Índigo
  '#8B5CF6', // Roxo Violeta
  '#EC4899', // Rosa Pink
  '#F43F5E', // Vermelho Carmim
  '#F97316', // Laranja Coral
  '#EAB308', // Dourado
  '#14B8A6', // Turquesa
  '#18181B', // Preto Ônix
  '#475569', // Cinza Titânio
];

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
}

interface BankPreset {
  name: string;
  gradient: [string, string];
  accentColor: string;
  packageName: string;
}

const BANK_PRESETS: BankPreset[] = [
  {
    name: 'Nubank',
    gradient: ['#820AD1', '#4C0677'],
    accentColor: '#820AD1',
    packageName: 'com.nu.production',
  },
  {
    name: 'Itaú',
    gradient: ['#EC7000', '#B34A00'],
    accentColor: '#EC7000',
    packageName: 'com.itau',
  },
  {
    name: 'Inter',
    gradient: ['#FF7A00', '#C25500'],
    accentColor: '#FF7A00',
    packageName: 'br.com.intermedium',
  },
  {
    name: 'C6 Bank',
    gradient: ['#2E2E2E', '#141414'],
    accentColor: '#E2E8F0',
    packageName: 'com.c6bank.app',
  },
  {
    name: 'Bradesco',
    gradient: ['#CC092F', '#850019'],
    accentColor: '#CC092F',
    packageName: 'com.bradesco',
  },
  {
    name: 'Santander',
    gradient: ['#EA1D2C', '#99000D'],
    accentColor: '#EA1D2C',
    packageName: 'com.santander.app',
  },
  {
    name: 'BTG Pactual',
    gradient: ['#002E8A', '#00133F'],
    accentColor: '#3B82F6',
    packageName: 'com.btg.pactual',
  },
  {
    name: 'Finz Black',
    gradient: ['#1E293B', '#0F172A'],
    accentColor: '#3B82F6',
    packageName: 'com.finz.app',
  },
];

export const AddCardModal: React.FC<AddCardModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const addCard = useWalletStore((s) => s.addCard);
  const profile = useWalletStore((s) => s.profile);

  const [bankName, setBankName] = useState('Nubank');
  const [cardholderName, setCardholderName] = useState(
    profile.fullName || profile.nickname || 'MEU CARTAO'
  );
  const [lastFour, setLastFour] = useState('1234');
  const [limitCents, setLimitCents] = useState(500000); // R$ 5.000,00
  const [balanceCents, setBalanceCents] = useState(0); // Fatura atual
  const [bankBalanceCents, setBankBalanceCents] = useState(0); // Saldo em conta
  const [selectedPreset, setSelectedPreset] = useState<BankPreset>(BANK_PRESETS[0]);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customHex, setCustomHex] = useState('#10B981');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeGradient: [string, string] = isCustomColor
    ? [customHex, darkenColor(customHex, 45)]
    : selectedPreset.gradient;
  const activeAccentColor = isCustomColor ? customHex : selectedPreset.accentColor;

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  // Reset ou inicialização
  React.useEffect(() => {
    if (visible) {
      setBankName(BANK_PRESETS[0].name);
      setSelectedPreset(BANK_PRESETS[0]);
      setIsCustomColor(false);
      setCustomHex('#10B981');
      setCardholderName(profile.fullName || profile.nickname || 'MEU CARTAO');
      setLastFour('1234');
      setLimitCents(500000);
      setBalanceCents(0);
      setBankBalanceCents(0);
      setErrorMsg(null);
    }
  }, [visible, profile]);

  const handleSelectPreset = (preset: BankPreset) => {
    setIsCustomColor(false);
    setSelectedPreset(preset);
    setBankName(preset.name);
  };

  const handleLimitChange = (text: string) => {
    const cleanNumbers = text.replace(/\D/g, '');
    const num = parseInt(cleanNumbers, 10);
    setLimitCents(isNaN(num) ? 0 : num);
  };

  const handleBalanceChange = (text: string) => {
    const cleanNumbers = text.replace(/\D/g, '');
    const num = parseInt(cleanNumbers, 10);
    setBalanceCents(isNaN(num) ? 0 : num);
  };

  const handleBankBalanceChange = (text: string) => {
    const cleanNumbers = text.replace(/\D/g, '');
    const num = parseInt(cleanNumbers, 10);
    setBankBalanceCents(isNaN(num) ? 0 : num);
  };

  const handleSave = () => {
    if (!bankName.trim()) {
      setErrorMsg('Informe o nome da instituição');
      return;
    }
    const cleanDigits = lastFour.replace(/\D/g, '');
    if (cleanDigits.length < 4) {
      setErrorMsg('Informe os 4 últimos dígitos do cartão');
      return;
    }

    addCard({
      bankName: bankName.trim().toUpperCase(),
      packageName: selectedPreset.packageName || 'com.finz.manual',
      lastFourDigits: cleanDigits.slice(-4),
      gradient: activeGradient,
      accentColor: activeAccentColor,
      cardholderName: (cardholderName || 'MEU CARTAO').trim().toUpperCase(),
      balance: balanceCents,
      limit: limitCents,
      bankBalance: bankBalanceCents,
      isManual: true,
    });

    onClose();
  };

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
                Novo Cartão Manual
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

            {/* Preview Visual em Tempo Real do Cartão */}
            <View style={styles.cardPreviewContainer}>
              <View style={[styles.cardPreview, { backgroundColor: activeGradient[0] }]}>
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <SvgLinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={activeGradient[0]} />
                      <Stop offset="100%" stopColor={activeGradient[1]} />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" rx={Radii.lg} fill="url(#cardGrad)" />
                </Svg>

                <View style={styles.cardPreviewTop}>
                  <Text style={styles.cardPreviewBankName}>
                    {bankName.toUpperCase() || 'BANCO'}
                  </Text>
                  <View style={styles.cardPreviewBadge}>
                    <Text style={styles.cardPreviewBadgeText}>MANUAL</Text>
                  </View>
                </View>

                <View style={styles.cardPreviewMiddle}>
                  <Text style={styles.cardPreviewDigits}>
                    •••• •••• •••• {lastFour ? lastFour.slice(-4) : '0000'}
                  </Text>
                </View>

                <View style={styles.cardPreviewBottom}>
                  <View>
                    <Text style={styles.cardPreviewLabel}>TITULAR</Text>
                    <Text style={styles.cardPreviewHolder} numberOfLines={1}>
                      {cardholderName.toUpperCase() || 'MEU CARTAO'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardPreviewLabel}>LIMITE DISPONÍVEL</Text>
                    <Text style={styles.cardPreviewLimit}>
                      {formatBRL(Math.max(0, limitCents - balanceCents))}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Presets Rápidos de Bancos */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              ESTILO E INSTITUIÇÃO
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScroll}
            >
              {/* Opção Cor Personalizada */}
              <Pressable
                onPress={() => setIsCustomColor(true)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle,
                    borderColor: isCustomColor ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Palette size={14} color={isCustomColor ? colors.primary : colors.textSecondary} />
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color: isCustomColor ? colors.text : colors.textSecondary,
                      fontFamily: isCustomColor ? Typography.bold : Typography.regular,
                    },
                  ]}
                >
                  Personalizado
                </Text>
                {isCustomColor && <Check size={12} color={colors.primary} />}
              </Pressable>

              {BANK_PRESETS.map((preset) => {
                const isSelected = !isCustomColor && selectedPreset.name === preset.name;
                return (
                  <Pressable
                    key={preset.name}
                    onPress={() => handleSelectPreset(preset)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.presetColorDot,
                        { backgroundColor: preset.accentColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: isSelected ? colors.text : colors.textSecondary,
                          fontFamily: isSelected ? Typography.bold : Typography.regular,
                        },
                      ]}
                    >
                      {preset.name}
                    </Text>
                    {isSelected && <Check size={12} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Painel de Cor Personalizada */}
            {isCustomColor && (
              <View style={styles.customColorSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                  PALETA DE CORES PERSONALIZADAS
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.swatchesScroll}
                >
                  {CUSTOM_SWATCHES.map((hex) => {
                    const isSelected = customHex.toLowerCase() === hex.toLowerCase();
                    return (
                      <Pressable
                        key={hex}
                        onPress={() => setCustomHex(hex)}
                        style={[
                          styles.swatchCircle,
                          {
                            backgroundColor: hex,
                            borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                            transform: [{ scale: isSelected ? 1.15 : 1 }],
                          },
                        ]}
                      >
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                  CÓDIGO HEXADECIMAL
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={[styles.swatchPreviewSmall, { backgroundColor: customHex }]} />
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>#</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, textTransform: 'uppercase' }]}
                    value={customHex.replace('#', '')}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                      setCustomHex(`#${clean}`);
                    }}
                    placeholder="10B981"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                </View>
              </View>
            )}

            {/* Nome do Banco */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              NOME DO BANCO / EMISSOR
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Building2 size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.inputField, { color: colors.text }]}
                value={bankName}
                onChangeText={(t) => {
                  setBankName(t);
                  setErrorMsg(null);
                }}
                placeholder="Ex: Nubank, Itaú, XP..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Nome do Titular e Últimos 4 dígitos */}
            <View style={styles.rowTwoCols}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                  TITULAR IMPRESSO
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <User size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    placeholder="TITULAR"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                  DÍGITOS
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Hash size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    value={lastFour}
                    onChangeText={(t) => setLastFour(t.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4092"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>

            {/* Limite Total */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              LIMITE TOTAL DE CRÉDITO
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>R$</Text>
              <TextInput
                style={[styles.inputField, { color: colors.text, fontFamily: Typography.bold }]}
                value={(limitCents / 100).toFixed(2).replace('.', ',')}
                onChangeText={handleLimitChange}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>

            {/* Fatura Atual e Saldo em Conta */}
            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                  FATURA ATUAL
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>R$</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    value={(balanceCents / 100).toFixed(2).replace('.', ',')}
                    onChangeText={handleBalanceChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                  SALDO EM CONTA
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>R$</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    value={(bankBalanceCents / 100).toFixed(2).replace('.', ',')}
                    onChangeText={handleBankBalanceChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>

            {/* Botão de Salvar */}
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
              <Text style={styles.saveButtonText}>Criar Cartão Manual</Text>
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
  cardPreviewContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  cardPreview: {
    width: '100%',
    height: 160,
    borderRadius: Radii.lg,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cardPreviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPreviewBankName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.bold,
    letterSpacing: 1,
  },
  cardPreviewBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardPreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: Typography.bold,
    letterSpacing: 0.5,
  },
  cardPreviewMiddle: {
    marginVertical: 4,
  },
  cardPreviewDigits: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontFamily: Typography.medium,
    letterSpacing: 2,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardPreviewLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 8,
    fontFamily: Typography.bold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardPreviewHolder: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.medium,
    maxWidth: 150,
  },
  cardPreviewLimit: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.bold,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  presetColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presetChipText: {
    fontSize: 12,
  },
  customColorSection: {
    marginTop: 4,
  },
  swatchesScroll: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchPreviewSmall: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  currencyPrefix: {
    fontSize: 14,
    fontFamily: Typography.bold,
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.medium,
    padding: 0,
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radii.lg,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: Typography.bold,
    color: '#000000',
    letterSpacing: -0.2,
  },
});
