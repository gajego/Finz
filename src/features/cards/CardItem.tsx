import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Wifi, Sparkles, Layers } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BankCard } from '@/types';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';

const { width } = Dimensions.get('window');
// Proporção física padrão de cartão bancário (ISO/IEC 7810 ID-1 = 1.586)
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH / 1.586;

interface CardItemProps {
  card: BankCard;
  onEditSkin: (card: BankCard) => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, onEditSkin }) => {
  const { colors } = useTheme();
  const privacyMode = useWalletStore((s) => s.privacyMode);

  // Física 3D com Reanimated
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(0.97, { damping: 15 });
    })
    .onUpdate((e) => {
      // Mapeia o deslocamento do dedo para inclinação angular realista (até 14 graus)
      rotateY.value = interpolate(e.translationX, [-CARD_WIDTH / 2, CARD_WIDTH / 2], [-14, 14]);
      rotateX.value = interpolate(e.translationY, [-CARD_HEIGHT / 2, CARD_HEIGHT / 2], [12, -12]);
    })
    .onFinalize(() => {
      // Retorno elástico suave à posição de repouso
      rotateX.value = withSpring(0, { damping: 12, stiffness: 120 });
      rotateY.value = withSpring(0, { damping: 12, stiffness: 120 });
      scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 900 },
        { scale: scale.value },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  const formatBRL = (cents: number) => {
    if (privacyMode) return '••••••';
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <View style={styles.outerWrapper}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardContainer, animatedCardStyle]}>
          {/* Wallpaper Fotográfico ou Textura */}
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
                { backgroundColor: card.gradient[0] },
              ]}
            />
          )}

          {/* Gradiente escuro para legibilidade e profundidade física */}
          <View style={styles.cardGradientOverlay} />

          {/* Reflexo de borda chanfrada estilo cartão de titânio */}
          <View style={styles.metallicBezel} />

          <View style={styles.cardContent}>
            {/* Linha Superior: Nome do Banco em caixa alta com kerning e Botão de Skin */}
            <View style={styles.topRow}>
              <View>
                <Text style={styles.bankName}>{card.bankName}</Text>
                <Text style={styles.debitCreditLabel}>DEBIT & CREDIT</Text>
              </View>

              <View style={styles.topRightActions}>
                <Pressable
                  onPress={() => onEditSkin(card)}
                  style={styles.skinButton}
                  hitSlop={10}
                >
                  <Sparkles size={13} color="#FFFFFF" />
                  <Text style={styles.skinButtonText}>CUSTOMIZAR</Text>
                </Pressable>
                <Wifi size={20} color="rgba(255, 255, 255, 0.85)" style={styles.nfcIcon} />
              </View>
            </View>

            {/* Linha Central: Chip EMV Realista e Selo Holográfico */}
            <View style={styles.chipRow}>
              {/* Chip metálico dourado detalhado */}
              <View style={styles.emvChip}>
                <View style={styles.chipPadsTop}>
                  <View style={styles.padLeft} />
                  <View style={styles.padRight} />
                </View>
                <View style={styles.chipCenter} />
                <View style={styles.chipPadsBottom}>
                  <View style={styles.padLeft} />
                  <View style={styles.padRight} />
                </View>
              </View>

              {/* Holographic Security Patch */}
              <View style={styles.hologramPatch}>
                <Layers size={14} color="rgba(255, 255, 255, 0.7)" />
              </View>
            </View>

            {/* Linha Inferior: Numeração em relevo laser, Titular e Limite */}
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.cardNumber}>
                  ••••  ••••  ••••  {card.lastFourDigits}
                </Text>
                <Text style={styles.cardholder}>{card.cardholderName}</Text>
              </View>

              <View style={styles.limitContainer}>
                <Text style={styles.limitLabel}>DISPONÍVEL</Text>
                <Text style={styles.limitValue}>
                  {formatBRL(card.limit - card.balance)}
                </Text>
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
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#121316',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 12,
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 9, 13, 0.45)',
  },
  metallicBezel: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
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
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  debitCreditLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skinButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nfcIcon: {
    transform: [{ rotate: '90deg' }],
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emvChip: {
    width: 44,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#D1AC4B',
    padding: 2,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#9E7E2C',
  },
  chipPadsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 9,
  },
  chipPadsBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 9,
  },
  padLeft: {
    width: '45%',
    backgroundColor: '#EAD385',
    borderRadius: 2,
  },
  padRight: {
    width: '45%',
    backgroundColor: '#EAD385',
    borderRadius: 2,
  },
  chipCenter: {
    alignSelf: 'center',
    width: 14,
    height: 8,
    backgroundColor: '#BA9435',
    borderRadius: 2,
  },
  hologramPatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardNumber: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  cardholder: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  limitContainer: {
    alignItems: 'flex-end',
  },
  limitLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  limitValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
