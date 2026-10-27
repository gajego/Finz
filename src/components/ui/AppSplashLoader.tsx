import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TEXT_WIDTH = 160;
const TEXT_HEIGHT = 72;
const BEAM_WIDTH = 64;

interface AppSplashLoaderProps {
  isReady: boolean;
  onFinish: () => void;
}

export const AppSplashLoader: React.FC<AppSplashLoaderProps> = ({
  isReady,
  onFinish,
}) => {
  // Posição do feixe neon percorrendo o nome (de -BEAM_WIDTH até TEXT_WIDTH + 20)
  const beamProgress = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const fullNeonFlash = useSharedValue(0);
  const ambientPulse = useSharedValue(0.3);

  useEffect(() => {
    // 1. Feixe de neon percorrendo continuamente o nome 'finz' da esquerda para a direita
    beamProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1250,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        }),
        withTiming(0, {
          duration: 0,
        })
      ),
      -1,
      false
    );

    // 2. Pulso de energia do ambiente
    ambientPulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Transição de saída quando a aplicação estiver pronta
  useEffect(() => {
    if (isReady) {
      // Quando pronto, acende o neon completo no nome inteiro em flash elegante
      fullNeonFlash.value = withTiming(1, { duration: 250 }, () => {
        containerOpacity.value = withTiming(
          0,
          {
            duration: 380,
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

  // Estilo da janela de feixe neon que se desloca da esquerda para a direita
  const beamWindowStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      beamProgress.value,
      [0, 1],
      [-BEAM_WIDTH, TEXT_WIDTH + 10]
    );

    return {
      transform: [{ translateX }],
    };
  });

  // O texto neon interno compensa o deslocamento da janela para criar o efeito de máscara perfeita
  const neonInnerTextStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      beamProgress.value,
      [0, 1],
      [BEAM_WIDTH, -(TEXT_WIDTH + 10)]
    );

    return {
      transform: [{ translateX }],
    };
  });

  // Ponto/feixe laser que corre na linha inferior
  const beamLaserDotStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      beamProgress.value,
      [0, 1],
      [-20, TEXT_WIDTH + 10]
    );

    return {
      transform: [{ translateX }],
    };
  });

  const fullFlashStyle = useAnimatedStyle(() => ({
    opacity: fullNeonFlash.value,
  }));

  const ambientGlowStyle = useAnimatedStyle(() => ({
    opacity: ambientPulse.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, containerAnimatedStyle]}
      pointerEvents={isReady ? 'none' : 'box-none'}
    >
      {/* Halo de luz ambiente neon no fundo */}
      <Animated.View style={[styles.ambientGlow, ambientGlowStyle]} />

      {/* Caixa do texto 'finz' */}
      <View style={styles.textContainer}>
        {/* 1. Base fosca escura do nome 'finz' */}
        <Text style={styles.baseText}>finz</Text>

        {/* 2. Feixe neon percorrendo as letras através de janela deslizante */}
        <Animated.View style={[styles.beamWindow, beamWindowStyle]}>
          <Animated.View style={[styles.neonTextWrapper, neonInnerTextStyle]}>
            <Text style={styles.neonText}>finz</Text>
          </Animated.View>
        </Animated.View>

        {/* 3. Camada de flash neon total no momento de liberação */}
        <Animated.View style={[StyleSheet.absoluteFill, fullFlashStyle]} pointerEvents="none">
          <Text style={styles.neonText}>finz</Text>
        </Animated.View>

        {/* 4. Linha guia de energia neon abaixo do nome */}
        <View style={styles.laserTrack}>
          <Animated.View style={[styles.laserBeam, beamLaserDotStyle]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#060709',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  ambientGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#D9F920',
    opacity: 0.12,
    shadowColor: '#D9F920',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 12,
  },
  textContainer: {
    width: TEXT_WIDTH,
    height: TEXT_HEIGHT + 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  baseText: {
    color: 'rgba(255, 255, 255, 0.18)',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 6,
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
    color: '#D9F920',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 6,
    textTransform: 'lowercase',
    textAlign: 'center',
    textShadowColor: '#D9F920',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  laserTrack: {
    position: 'absolute',
    bottom: 2,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  laserBeam: {
    width: 36,
    height: '100%',
    backgroundColor: '#D9F920',
    borderRadius: 1,
    shadowColor: '#D9F920',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
});
