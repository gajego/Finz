import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Check, RotateCcw, Palette, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import { BankCard } from '@/types';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, LetterSpacing } from '@/theme/typography';
import { getBankPresetTheme } from '@/services/pluggy/pluggyService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 48;
const PREVIEW_HEIGHT = PREVIEW_WIDTH / 1.586;

interface CardSkinModalProps {
  card: BankCard | null;
  visible: boolean;
  onClose: () => void;
}

// Cores e Gradientes Oficiais dos Maiores Bancos
const OFFICIAL_BANK_PRESETS = [
  {
    id: 'b_nubank',
    name: 'Nubank',
    bank: 'NUBANK',
    gradient: ['#820AD1', '#4C0677'] as [string, string],
    color: '#820AD1',
  },
  {
    id: 'b_itau',
    name: 'Itaú',
    bank: 'ITAÚ',
    gradient: ['#EC7000', '#1C1917'] as [string, string],
    color: '#EC7000',
  },
  {
    id: 'b_inter',
    name: 'Inter',
    bank: 'INTER',
    gradient: ['#FF7A00', '#7A3200'] as [string, string],
    color: '#FF7A00',
  },
  {
    id: 'b_c6',
    name: 'C6 Bank',
    bank: 'C6 BANK',
    gradient: ['#18181B', '#09090B'] as [string, string],
    color: '#242424',
  },
  {
    id: 'b_santander',
    name: 'Santander',
    bank: 'SANTANDER',
    gradient: ['#EA1D2C', '#5A060C'] as [string, string],
    color: '#EA1D2C',
  },
  {
    id: 'b_bradesco',
    name: 'Bradesco',
    bank: 'BRADESCO',
    gradient: ['#CC092F', '#4A020F'] as [string, string],
    color: '#CC092F',
  },
  {
    id: 'b_bb',
    name: 'Banco do Brasil',
    bank: 'BANCO DO BRASIL',
    gradient: ['#003882', '#001A40'] as [string, string],
    color: '#FCDB00',
  },
  {
    id: 'b_caixa',
    name: 'Caixa',
    bank: 'CAIXA',
    gradient: ['#005CA9', '#002850'] as [string, string],
    color: '#005CA9',
  },
  {
    id: 'b_btg',
    name: 'BTG Pactual',
    bank: 'BTG PACTUAL',
    gradient: ['#001E62', '#000D2B'] as [string, string],
    color: '#001E62',
  },
  {
    id: 'b_mp',
    name: 'Mercado Pago',
    bank: 'MERCADO PAGO',
    gradient: ['#009EE3', '#003E60'] as [string, string],
    color: '#009EE3',
  },
  {
    id: 'b_picpay',
    name: 'PicPay',
    bank: 'PICPAY',
    gradient: ['#11C76F', '#074825'] as [string, string],
    color: '#11C76F',
  },
  {
    id: 'b_neon',
    name: 'Neon',
    bank: 'NEON',
    gradient: ['#00D2FF', '#005080'] as [string, string],
    color: '#00D2FF',
  },
  {
    id: 'b_xp',
    name: 'XP',
    bank: 'XP INVESTIMENTOS',
    gradient: ['#1C1C1E', '#09090B'] as [string, string],
    color: '#FFFFFF',
  },
];

// Presets de Materiais e Texturas Físicas Premium
const MATERIAL_PRESETS = [
  {
    id: 'm_titanium',
    name: 'TITANIUM OBSIDIAN',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#0A0A0C', '#121217'] as [string, string],
  },
  {
    id: 'm_acid',
    name: 'ACID MATRIX',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#040405', '#161908'] as [string, string],
  },
  {
    id: 'm_onyx',
    name: 'ONYX GOLD',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#1C1608', '#0A0804'] as [string, string],
  },
  {
    id: 'm_chromatic',
    name: 'CHROMATIC FOIL',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#180A2E', '#0A0514'] as [string, string],
  },
  {
    id: 'm_damascus',
    name: 'BRUSHED DAMASCUS',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#141518', '#08090A'] as [string, string],
  },
  {
    id: 'm_emerald',
    name: 'EMERALD LUXURY',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#062419', '#02100A'] as [string, string],
  },
];

export const CardSkinModal: React.FC<CardSkinModalProps> = ({ card, visible, onClose }) => {
  const { colors, mode } = useTheme();
  const updateCardSkin = useWalletStore((s) => s.updateCardSkin);
  const privacyMode = useWalletStore((s) => s.privacyMode);

  // Estados locais de preview em tempo real
  const [selectedGradient, setSelectedGradient] = useState<[string, string]>(['#111215', '#08090C']);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | undefined>(undefined);
  const [customUrl, setCustomUrl] = useState('');

  // Sincroniza estado com o cartão aberto
  useEffect(() => {
    if (card) {
      setSelectedGradient(card.gradient || ['#111215', '#08090C']);
      setSelectedWallpaper(card.wallpaperUri);
      setCustomUrl('');
    }
  }, [card, visible]);

  // Física 3D Interativa de Toque no Cartão Expandido
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const previewPanGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.98, { damping: 16 });
    })
    .onUpdate((e) => {
      'worklet';
      rotateY.value = interpolate(
        e.translationX,
        [-PREVIEW_WIDTH / 2, PREVIEW_WIDTH / 2],
        [-18, 18],
        'clamp'
      );
      rotateX.value = interpolate(
        e.translationY,
        [-PREVIEW_HEIGHT / 2, PREVIEW_HEIGHT / 2],
        [15, -15],
        'clamp'
      );
    })
    .onFinalize(() => {
      'worklet';
      rotateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      rotateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    });

  const animatedPreviewStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1100 },
        { scale: scale.value },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  const animatedGlareStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      rotateY.value,
      [-18, 18],
      [-PREVIEW_WIDTH * 0.45, PREVIEW_WIDTH * 0.45]
    );
    const translateY = interpolate(
      rotateX.value,
      [-15, 15],
      [-PREVIEW_HEIGHT * 0.35, PREVIEW_HEIGHT * 0.35]
    );
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  if (!card) return null;

  // Categoria e Nomenclatura Real do Cartão
  const cardVariantBadge = (() => {
    const b = (card.bankName || '').toUpperCase();
    if (b.includes('NUBANK')) return 'MASTERCARD GOLD';
    if (b.includes('ITAU') || b.includes('ITAÚ')) return 'VISA PLATINUM';
    if (b.includes('INTER')) return 'MASTERCARD BLACK';
    if (b.includes('C6')) return 'CARBON BLACK';
    if (b.includes('BRADESCO')) return 'ELO NANQUIM';
    if (b.includes('SANTANDER')) return 'UNLIMITED';
    if (b.includes('BRASIL')) return 'OUROCARD VISA';
    return 'CRÉDITO & DÉBITO';
  })();

  const formatBRL = (cents: number) => {
    if (privacyMode) return '••••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Aplica preset de cor oficial do banco
  const handleSelectBankColor = (gradient: [string, string]) => {
    setSelectedGradient(gradient);
    setSelectedWallpaper(undefined);
    updateCardSkin(card.id, undefined, gradient);
  };

  // Aplica preset de textura física / material
  const handleSelectMaterial = (url: string, gradient: [string, string]) => {
    setSelectedWallpaper(url);
    setSelectedGradient(gradient);
    updateCardSkin(card.id, url, gradient);
  };

  // Restaura o visual de fábrica da instituição bancária
  const handleRestoreDefaultBankColor = () => {
    const defaultTheme = getBankPresetTheme(card.bankName);
    setSelectedGradient(defaultTheme.gradient);
    setSelectedWallpaper(undefined);
    updateCardSkin(card.id, undefined, defaultTheme.gradient);
  };

  // Aplica URL de imagem customizada
  const handleApplyCustomUrl = () => {
    if (customUrl.trim().length > 0) {
      const url = customUrl.trim();
      setSelectedWallpaper(url);
      updateCardSkin(card.id, url, ['#08090C', '#13151B']);
      setCustomUrl('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View
            style={[
              styles.sheet,
              {
                backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.background,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            {/* Header com Affordance e Fechar */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>PERSONALIZAR CARTÃO</Text>
                <Text style={[styles.subtitle, { color: colors.primary }]}>
                  {card.bankName} • {cardVariantBadge}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                hitSlop={8}
              >
                <X size={16} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* PREVIEW DO CARTÃO EXPANDIDO EM 3D */}
              <View style={styles.previewWrapper}>
                <GestureDetector gesture={previewPanGesture}>
                  <Animated.View style={[styles.previewCard, animatedPreviewStyle]}>
                    {/* Fundo: Wallpaper ou Gradiente Selecionado */}
                    {selectedWallpaper ? (
                      <Image
                        source={{ uri: selectedWallpaper }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: selectedGradient[0] || '#111215' },
                        ]}
                      />
                    )}

                    {/* Overlay de contraste */}
                    <View style={styles.cardGradientOverlay} />

                    {/* Reflexo Especular Dinâmico */}
                    <Animated.View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, styles.glareLayer, animatedGlareStyle]}
                    >
                      <Svg width={PREVIEW_WIDTH * 1.6} height={PREVIEW_HEIGHT * 1.6} viewBox="0 0 400 250">
                        <Defs>
                          <SvgLinearGradient id="previewGleam" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.24" />
                            <Stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.08" />
                            <Stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
                          </SvgLinearGradient>
                        </Defs>
                        <Rect x="-50" y="-50" width="500" height="350" fill="url(#previewGleam)" />
                      </Svg>
                    </Animated.View>

                    {/* Borda Lapidada */}
                    <View style={styles.metallicBezel} />

                    {/* Conteúdo do Cartão */}
                    <View style={styles.cardContent}>
                      {/* Top Row */}
                      <View style={styles.cardTopRow}>
                        <View>
                          <Text style={styles.bankNameText}>{card.bankName}</Text>
                          <View style={styles.subBadgeRow}>
                            <Text style={styles.debitCreditText}>DEBIT & CREDIT</Text>
                            <View style={styles.microDot} />
                            <Text style={styles.variantBadgeText}>{cardVariantBadge}</Text>
                          </View>
                        </View>

                        {/* Contactless */}
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                          <Path d="M8.5 7.5C10.8 9.8 10.8 14.2 8.5 16.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                          <Path d="M12 4.5C16 8.5 16 15.5 12 19.5" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
                          <Path d="M15.5 2C21.2 7.7 21.2 16.3 15.5 22" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                      </View>

                      {/* Chip e Selo */}
                      <View style={styles.chipRow}>
                        <View style={styles.chipBox}>
                          <View style={styles.chipInner} />
                        </View>
                        <View style={styles.holoBox}>
                          <Sparkles size={16} color="rgba(255, 255, 255, 0.75)" />
                        </View>
                      </View>

                      {/* Bottom Row */}
                      <View style={styles.cardBottomRow}>
                        <View>
                          <Text style={styles.cardNumberText}>
                            ••••  ••••  ••••  {card.lastFourDigits}
                          </Text>
                          <Text style={styles.cardholderText} numberOfLines={1}>
                            {card.cardholderName || 'TITULAR DO CARTÃO'}
                          </Text>
                        </View>

                        <View style={styles.balanceCol}>
                          {card.bankBalance !== undefined && card.bankBalance > 0 ? (
                            <>
                              <Text style={styles.balanceLabelText}>SALDO CONTA</Text>
                              <Text style={styles.balanceValueText}>
                                {formatBRL(card.bankBalance)}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.balanceLabelText}>DISPONÍVEL</Text>
                              <Text style={styles.balanceValueText}>
                                {formatBRL(card.limit - card.balance)}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                </GestureDetector>
                <Text style={[styles.interactiveHint, { color: colors.textMuted }]}>
                  Toque e deslize para interagir com a física 3D do cartão
                </Text>
              </View>

              {/* SEÇÃO 1: CORES OFICIAIS DOS BANCOS */}
              <View style={styles.sectionHeaderRow}>
                <Palette size={13} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  CORES OFICIAIS DOS BANCOS
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankPresetsRow}>
                {OFFICIAL_BANK_PRESETS.map((bank) => {
                  const isSelected =
                    !selectedWallpaper && selectedGradient[0].toLowerCase() === bank.gradient[0].toLowerCase();
                  return (
                    <Pressable
                      key={bank.id}
                      onPress={() => handleSelectBankColor(bank.gradient)}
                      style={({ pressed }) => [
                        styles.bankPillItem,
                        {
                          backgroundColor: bank.gradient[0],
                          borderColor: isSelected ? colors.primary : 'rgba(255, 255, 255, 0.15)',
                          transform: [{ scale: pressed ? 0.95 : isSelected ? 1.04 : 1 }],
                        },
                        isSelected && styles.bankPillSelected,
                      ]}
                    >
                      <View style={styles.bankPillOverlay} />
                      <Text style={styles.bankPillText}>{bank.name}</Text>
                      {isSelected && (
                        <View style={[styles.selectedCheckCircle, { backgroundColor: colors.primary }]}>
                          <Check size={9} color={colors.primaryForeground} strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* SEÇÃO 2: MATERIAIS & TEXTURAS PREMIUM */}
              <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
                <Sparkles size={13} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  MATERIAIS & TEXTURAS METALÚRGICAS
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.materialsRow}>
                {MATERIAL_PRESETS.map((mat) => {
                  const isSelected = selectedWallpaper === mat.url;
                  return (
                    <Pressable
                      key={mat.id}
                      onPress={() => handleSelectMaterial(mat.url, mat.gradient)}
                      style={({ pressed }) => [
                        styles.materialItem,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          transform: [{ scale: pressed ? 0.96 : isSelected ? 1.02 : 1 }],
                        },
                        isSelected && { borderWidth: 2 },
                      ]}
                    >
                      <Image source={{ uri: mat.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <View style={styles.materialOverlay} />
                      <Text style={styles.materialText}>{mat.name}</Text>
                      {isSelected && (
                        <View style={[styles.selectedCheckCircle, { backgroundColor: colors.primary }]}>
                          <Check size={9} color={colors.primaryForeground} strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* SEÇÃO 3: RESTAURAR COR ORIGINAL DO BANCO */}
              <Pressable
                onPress={handleRestoreDefaultBankColor}
                style={({ pressed }) => [
                  styles.restoreDefaultButton,
                  {
                    backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <RotateCcw size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.restoreDefaultText, { color: colors.textSecondary }]}>
                  RESTAURAR VISUAL PADRÃO DO {card.bankName}
                </Text>
              </Pressable>

              {/* SEÇÃO 4: WALLPAPER PERSONALIZADO VIA URL */}
              <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                <ImageIcon size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  VINCULAR WALLPAPER VIA URL
                </Text>
              </View>
              <View style={styles.customUrlRow}>
                <TextInput
                  placeholder="https://exemplo.com/sua-imagem.png"
                  placeholderTextColor={colors.textMuted}
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  style={[
                    styles.urlInput,
                    {
                      backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceSubtle,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <Pressable
                  onPress={handleApplyCustomUrl}
                  style={({ pressed }) => [
                    styles.applyUrlButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.applyUrlText, { color: colors.primaryForeground }]}>
                    APLICAR
                  </Text>
                </Pressable>
              </View>

              {/* BOTÃO FINALIZAR / CONCLUIR */}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.finishButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Check size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                <Text style={[styles.finishButtonText, { color: colors.primaryForeground }]}>
                  CONCLUIR PERSONALIZAÇÃO
                </Text>
              </Pressable>
            </ScrollView>
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 15,
    letterSpacing: LetterSpacing.wider,
  },
  subtitle: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wide,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  previewWrapper: {
    alignItems: 'center',
    marginBottom: 18,
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F1014',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 12,
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 7, 10, 0.38)',
  },
  glareLayer: {
    left: -PREVIEW_WIDTH * 0.3,
    top: -PREVIEW_HEIGHT * 0.3,
  },
  metallicBezel: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankNameText: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    fontSize: 13,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  subBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  debitCreditText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: Typography.bold,
    fontSize: 7.5,
    letterSpacing: LetterSpacing.wider,
  },
  microDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  variantBadgeText: {
    color: 'rgba(217, 249, 32, 0.95)',
    fontFamily: Typography.bold,
    fontSize: 7.5,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipBox: {
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#D4AF37',
    borderWidth: 1,
    borderColor: '#7A5E18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: 14,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#AA8528',
  },
  holoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardNumberText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: LetterSpacing.wide,
    fontVariant: ['tabular-nums'],
  },
  cardholderText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: Typography.bold,
    fontSize: 8.5,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
    marginTop: 2,
    maxWidth: 160,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceLabelText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: Typography.bold,
    fontSize: 7.5,
    letterSpacing: LetterSpacing.wider,
  },
  balanceValueText: {
    color: '#00D09E',
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: LetterSpacing.tight,
    fontVariant: ['tabular-nums'],
  },
  interactiveHint: {
    fontFamily: Typography.medium,
    fontSize: 10,
    marginTop: 8,
    letterSpacing: LetterSpacing.wide,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  bankPresetsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  bankPillItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minWidth: 80,
  },
  bankPillSelected: {
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bankPillOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  bankPillText: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
    zIndex: 2,
  },
  selectedCheckCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  materialsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  materialItem: {
    width: 110,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
    borderWidth: 1,
    position: 'relative',
  },
  materialOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  materialText: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    fontSize: 8.5,
    letterSpacing: LetterSpacing.wide,
    zIndex: 2,
  },
  restoreDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  restoreDefaultText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  customUrlRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  urlInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 11,
    fontFamily: Typography.medium,
  },
  applyUrlButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyUrlText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    height: 48,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  finishButtonText: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: LetterSpacing.wider,
  },
});
