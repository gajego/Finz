import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BankCard } from '@/types';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, LetterSpacing } from '@/theme/typography';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH / 1.586;

interface CardItemProps {
  card: BankCard;
  onEditSkin: (card: BankCard) => void;
}

/**
 * Chip EMV de Alta Precisão Metalúrgica (Ouro Acetinado com Micro-Circuitos)
 */
const EmvChipSvg: React.FC = () => {
  return (
    <Svg width={46} height={34} viewBox="0 0 46 34" fill="none">
      <Defs>
        {/* Gradiente Dourado Metálico do Chip */}
        <SvgLinearGradient id="chipGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F9E8A2" />
          <Stop offset="35%" stopColor="#D4AF37" />
          <Stop offset="70%" stopColor="#AA8528" />
          <Stop offset="100%" stopColor="#F1DA8E" />
        </SvgLinearGradient>

        {/* Gradiente de Reflexo Especular da Superfície */}
        <SvgLinearGradient id="chipHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>

      {/* Base Chanfrada do Chip */}
      <Rect
        x="0.8"
        y="0.8"
        width="44.4"
        height="32.4"
        rx="5.5"
        fill="url(#chipGoldGrad)"
        stroke="#7A5E18"
        strokeWidth="1.2"
      />

      {/* Brilho Superior */}
      <Rect
        x="1.5"
        y="1.5"
        width="43"
        height="12"
        rx="4"
        fill="url(#chipHighlight)"
      />

      {/* Micro-Circuitos Gravados a Laser (Frisos dos Pads EMV) */}
      <Path
        d="M 1 11 H 16 C 18 11 19 12 19 14 V 20 C 19 22 18 23 16 23 H 1"
        stroke="#6B5113"
        strokeWidth="1.1"
        fill="none"
      />
      <Path
        d="M 45 11 H 30 C 28 11 27 12 27 14 V 20 C 27 22 28 23 30 23 H 45"
        stroke="#6B5113"
        strokeWidth="1.1"
        fill="none"
      />
      <Path
        d="M 19 17 H 27"
        stroke="#6B5113"
        strokeWidth="1.1"
      />
      <Path
        d="M 23 1 V 11"
        stroke="#6B5113"
        strokeWidth="1.1"
      />
      <Path
        d="M 23 23 V 33"
        stroke="#6B5113"
        strokeWidth="1.1"
      />

      {/* Ilha Central com Corte de Contato */}
      <Rect
        x="19"
        y="13"
        width="8"
        height="8"
        rx="2"
        fill="#9C7722"
        stroke="#6B5113"
        strokeWidth="0.8"
      />
    </Svg>
  );
};

/**
 * Ícone Contactless / NFC Estilizado com Ondas de Radiofrequência
 */
const ContactlessSvg: React.FC = () => {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 7.5C10.8 9.8 10.8 14.2 8.5 16.5"
        stroke="rgba(255, 255, 255, 0.95)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M12 4.5C16 8.5 16 15.5 12 19.5"
        stroke="rgba(255, 255, 255, 0.75)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M15.5 2C21.2 7.7 21.2 16.3 15.5 22"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

/**
 * Selo Holográfico de Segurança com Anéis Prismáticos
 */
const HologramPatchSvg: React.FC = () => {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none">
      <Defs>
        <SvgLinearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
          <Stop offset="30%" stopColor="rgba(147, 197, 253, 0.4)" />
          <Stop offset="65%" stopColor="rgba(217, 249, 32, 0.35)" />
          <Stop offset="100%" stopColor="rgba(244, 114, 182, 0.35)" />
        </SvgLinearGradient>
      </Defs>
      <Rect
        x="1"
        y="1"
        width="32"
        height="32"
        rx="10"
        fill="url(#holoGrad)"
        stroke="rgba(255, 255, 255, 0.28)"
        strokeWidth="1.2"
      />
      <Circle
        cx="17"
        cy="17"
        r="9"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      <Circle
        cx="17"
        cy="17"
        r="4"
        fill="rgba(255, 255, 255, 0.4)"
      />
    </Svg>
  );
};

export const CardItem: React.FC<CardItemProps> = ({ card, onEditSkin }) => {
  const { colors } = useTheme();
  const privacyMode = useWalletStore((s) => s.privacyMode);

  // Física 3D e expansão com Reanimated
  // Ângulos base para o visual "meio inclinado em 3D"
  const BASE_ROTATE_X = 9;
  const BASE_ROTATE_Y = -13;
  const BASE_ROTATE_Z = 2.5;

  const rotateX = useSharedValue(BASE_ROTATE_X);
  const rotateY = useSharedValue(BASE_ROTATE_Y);
  const rotateZ = useSharedValue(BASE_ROTATE_Z);
  const scale = useSharedValue(1);

  // Inicia o movimento contínuo bem sutil em torno do ângulo inclinado 3D
  const startSubtleFloatAnimation = () => {
    'worklet';
    rotateX.value = withRepeat(
      withSequence(
        withTiming(BASE_ROTATE_X + 1.8, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        withTiming(BASE_ROTATE_X - 1.8, { duration: 3400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    rotateY.value = withRepeat(
      withSequence(
        withTiming(BASE_ROTATE_Y - 2.0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(BASE_ROTATE_Y + 2.0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    rotateZ.value = withRepeat(
      withSequence(
        withTiming(BASE_ROTATE_Z + 0.8, { duration: 4600, easing: Easing.inOut(Easing.sin) }),
        withTiming(BASE_ROTATE_Z - 0.8, { duration: 4600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  };

  useEffect(() => {
    startSubtleFloatAnimation();
  }, []);

  // Gesto de Clique: Quando clicar, o cartão apenas dá uma afundada suave bem rápido e elástica
  const tapGesture = Gesture.Tap()
    .maxDuration(350)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.94, { damping: 14, stiffness: 350 });
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 12, stiffness: 280 });
      runOnJS(onEditSkin)(card);
    });

  // Gesto de Arrasto 3D: Permite inclinar o cartão manualmente com o dedo com física elástica
  const panGesture = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .failOffsetX([-24, 24]) // Deixa o carrossel horizontal de cartões livre
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.97, { damping: 14, stiffness: 220 });
    })
    .onUpdate((e) => {
      'worklet';
      rotateY.value = interpolate(
        e.translationX,
        [-CARD_WIDTH / 2, CARD_WIDTH / 2],
        [BASE_ROTATE_Y - 18, BASE_ROTATE_Y + 18],
        'clamp'
      );
      rotateX.value = interpolate(
        e.translationY,
        [-CARD_HEIGHT / 2, CARD_HEIGHT / 2],
        [BASE_ROTATE_X + 16, BASE_ROTATE_X - 16],
        'clamp'
      );
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
      rotateX.value = withSpring(BASE_ROTATE_X, { damping: 14, stiffness: 160 });
      rotateY.value = withSpring(BASE_ROTATE_Y, { damping: 14, stiffness: 160 });
      rotateZ.value = withSpring(BASE_ROTATE_Z, { damping: 14, stiffness: 160 }, (finished) => {
        if (finished) {
          startSubtleFloatAnimation();
        }
      });
    });

  const cardGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { scale: scale.value },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
        { rotateZ: `${rotateZ.value}deg` },
      ],
    };
  });

  // Reflexo de Luz Especular Dinâmico que acompanha os ângulos 3D
  const animatedGlareStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      rotateY.value,
      [BASE_ROTATE_Y - 16, BASE_ROTATE_Y + 16],
      [-CARD_WIDTH * 0.45, CARD_WIDTH * 0.45]
    );
    const translateY = interpolate(
      rotateX.value,
      [BASE_ROTATE_X - 14, BASE_ROTATE_X + 14],
      [-CARD_HEIGHT * 0.35, CARD_HEIGHT * 0.35]
    );
    return {
      transform: [{ translateX }, { translateY }],
    };
  });

  const formatBRL = (cents: number) => {
    if (privacyMode) return '••••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Nomenclatura e Categoria Real da Instituição Bancária (Zero Mocks, Zero "Finz")
  const cardVariantBadge = useMemo(() => {
    const b = (card.bankName || '').toUpperCase();
    if (b.includes('NUBANK')) return 'MASTERCARD GOLD';
    if (b.includes('ITAU') || b.includes('ITAÚ')) return 'VISA PLATINUM';
    if (b.includes('INTER')) return 'MASTERCARD BLACK';
    if (b.includes('C6')) return 'CARBON BLACK';
    if (b.includes('BRADESCO')) return 'ELO NANQUIM';
    if (b.includes('SANTANDER')) return 'UNLIMITED';
    if (b.includes('BRASIL')) return 'OUROCARD VISA';
    return 'CRÉDITO & DÉBITO';
  }, [card.bankName]);

  return (
    <View style={styles.outerWrapper}>
      <GestureDetector gesture={cardGesture}>
        <Animated.View style={[styles.cardContainer, animatedCardStyle]}>
          {/* Fundo do Cartão: Imagem ou Base Gradiente Primária */}
          {card.wallpaperUri ? (
            <Image
              source={{ uri: card.wallpaperUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: card.gradient[0] || '#111215' },
              ]}
            />
          )}

          {/* Gradiente escuro para contraste de tipografia */}
          <View style={styles.cardGradientOverlay} />

          {/* Reflexo Especular Diagonal (Luz Plástica / Metálica a 45°) */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.glareLayer, animatedGlareStyle]}
          >
            <Svg width={CARD_WIDTH * 1.6} height={CARD_HEIGHT * 1.6} viewBox="0 0 400 250">
              <Defs>
                <SvgLinearGradient id="specularGleam" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
                  <Stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.08" />
                  <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x="-50"
                y="-50"
                width="500"
                height="350"
                fill="url(#specularGleam)"
              />
            </Svg>
          </Animated.View>

          {/* Borda Metálica Lapidada a Laser (Metallic Bezel) */}
          <View style={styles.metallicBezel} />

          {/* Conteúdo do Cartão */}
          <View style={styles.cardContent}>
            {/* Linha Superior: Nome do Banco e Ícone Contactless NFC */}
            <View style={styles.topRow}>
              <View>
                <Text style={styles.bankName}>{card.bankName}</Text>
                <View style={styles.subBadgeRow}>
                  <Text style={styles.debitCreditLabel}>DEBIT & CREDIT</Text>
                  <View style={styles.microDot} />
                  <Text style={styles.cardVariantLabel}>{cardVariantBadge}</Text>
                </View>
              </View>

              <View style={styles.topRightActions}>
                <ContactlessSvg />
              </View>
            </View>

            {/* Linha Central: Chip EMV Ouro Acetinado e Selo Holográfico */}
            <View style={styles.chipRow}>
              <EmvChipSvg />
              <HologramPatchSvg />
            </View>

            {/* Linha Inferior: Numeração em Relevo Tabular, Titular e Limite Disponível */}
            <View style={styles.bottomRow}>
              <View style={styles.holderCol}>
                <Text style={styles.cardNumber}>
                  ••••  ••••  ••••  {card.lastFourDigits}
                </Text>
                <Text style={styles.cardholder} numberOfLines={1}>
                  {card.cardholderName || 'TITULAR DO CARTÃO'}
                </Text>
              </View>

              <View style={styles.limitContainer}>
                {card.bankBalance !== undefined && card.bankBalance > 0 ? (
                  <>
                    <Text style={styles.balanceLabel}>SALDO CONTA</Text>
                    <Text style={styles.balanceValue}>
                      {formatBRL(card.bankBalance)}
                    </Text>
                    <View style={styles.limitSubRow}>
                      <Text style={styles.limitSubLabel}>FATURA ATUAL</Text>
                      <Text style={styles.limitSubValue}>
                        {formatBRL(card.balance)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.limitLabel}>FATURA ATUAL</Text>
                    <Text style={styles.balanceValue}>
                      {formatBRL(card.balance)}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    width: width,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F1014',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 7, 10, 0.42)',
  },
  glareLayer: {
    left: -CARD_WIDTH * 0.3,
    top: -CARD_HEIGHT * 0.3,
  },
  metallicBezel: {
    ...StyleSheet.absoluteFill,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  cardContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankName: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    fontSize: 14,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  subBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  debitCreditLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: LetterSpacing.wider,
  },
  microDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  cardVariantLabel: {
    color: 'rgba(217, 249, 32, 0.95)',
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  topRightActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holderCol: {
    flex: 1,
    marginRight: 12,
  },
  cardNumber: {
    color: 'rgba(255, 255, 255, 0.96)',
    fontFamily: Typography.bold,
    fontSize: 16,
    letterSpacing: LetterSpacing.widest,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  cardholder: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },
  limitContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: '#00D09E',
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 1,
  },
  balanceValue: {
    color: '#00D09E',
    fontFamily: Typography.bold,
    fontSize: 15,
    letterSpacing: LetterSpacing.tight,
    fontVariant: ['tabular-nums'],
  },
  limitSubRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  limitSubLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: Typography.bold,
    fontSize: 7.5,
    letterSpacing: LetterSpacing.wider,
  },
  limitSubValue: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: Typography.medium,
    fontSize: 12,
    letterSpacing: LetterSpacing.tight,
    fontVariant: ['tabular-nums'],
  },
  limitLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: Typography.bold,
    fontSize: 8.5,
    letterSpacing: LetterSpacing.wider,
  },
  limitValue: {
    color: '#FFFFFF',
    fontFamily: Typography.bold,
    fontSize: 16,
    letterSpacing: LetterSpacing.tight,
  },
});
