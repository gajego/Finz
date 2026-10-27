import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Typography } from '@/theme/typography';
import { DarkTheme } from '@/theme/colors';

const TEXT_WIDTH = 175;
const TEXT_HEIGHT = 74;
const BEAM_WIDTH = 75;

interface AppSplashLoaderProps {
  isReady: boolean;
  onFinish: () => void;
}

export const AppSplashLoader: React.FC<AppSplashLoaderProps> = ({
  isReady,
  onFinish,
}) => {
  // Posição contínua do feixe neon percorrendo o nome 'finz' da esquerda para a direita
  const beamProgress = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const fullNeonFlash = useSharedValue(0);

  useEffect(() => {
    // Feixe neon percorrendo a palavra finz continuamente
    beamProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1350,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }),
        withTiming(0, {
          duration: 0,
        })
      ),
      -1,
      false
    );
  }, []);

  // Transição suave ao liberar o app
  useEffect(() => {
    if (isReady) {
      fullNeonFlash.value = withTiming(1, { duration: 240 }, () => {
        containerOpacity.value = withTiming(
          0,
          {
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          },
          (finished) => {
            if (finished) {
              runOnJS(onFinish)();
            }
          }
        );
      });
    }
  }, [isReady, onFinish]);

  // Janela deslizante do feixe neon
  const beamWindowStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      beamProgress.value,
      [0, 1],
      [-BEAM_WIDTH, TEXT_WIDTH + 15]
    );

    return {
      transform: [{ translateX }],
    };
  });

  // O texto interno compensa o deslocamento criando o efeito de máscara perfeito
  const neonInnerTextStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      beamProgress.value,
      [0, 1],
      [BEAM_WIDTH, -(TEXT_WIDTH + 15)]
    );

    return {
      transform: [{ translateX }],
    };
  });

  const fullFlashStyle = useAnimatedStyle(() => ({
    opacity: fullNeonFlash.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, containerAnimatedStyle]}
      pointerEvents={isReady ? 'none' : 'box-none'}
    >
      {/* Apenas o nome 'finz', sem círculos ou artefatos ao fundo */}
      <View style={styles.textContainer}>
        {/* 1. Base do nome na cor principal do sistema com luminosidade suave */}
        <Text style={styles.baseText}>finz</Text>

        {/* 2. Feixe neon de alta intensidade percorrendo a tipografia */}
        <Animated.View style={[styles.beamWindow, beamWindowStyle]}>
          <Animated.View style={[styles.neonTextWrapper, neonInnerTextStyle]}>
            <Text style={styles.neonText}>finz</Text>
          </Animated.View>
        </Animated.View>

        {/* 3. Flash neon sutil de preenchimento total no momento de liberação */}
        <Animated.View style={[StyleSheet.absoluteFill, fullFlashStyle]} pointerEvents="none">
          <Text style={styles.neonText}>finz</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: DarkTheme.background, // Fundo dark do sistema (#040405)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  textContainer: {
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  baseText: {
    color: DarkTheme.primary, // Cor principal do sistema (#D9F920)
    opacity: 0.22, // Base sutil aguardando a passagem do feixe neon
    fontSize: 56,
    fontFamily: Typography.bold,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  beamWindow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BEAM_WIDTH,
    height: TEXT_HEIGHT,
    overflow: 'hidden',
  },
  neonTextWrapper: {
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonText: {
    color: DarkTheme.primary, // Cor principal do sistema vibrante (#D9F920)
    fontSize: 56,
    fontFamily: Typography.bold,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'lowercase',
    textAlign: 'center',
    // Brilho Neon elétrico projetado
    textShadowColor: DarkTheme.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
});
