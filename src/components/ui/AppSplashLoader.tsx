import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Proporção de exibição equilibrada no viewport (40% da largura, max 176px)
const LOGO_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.40), 176);

interface AppSplashLoaderProps {
  isReady: boolean;
  onFinish: () => void;
}

export const AppSplashLoader: React.FC<AppSplashLoaderProps> = ({
  isReady,
  onFinish,
}) => {
  // 1. Escala base e Opacidade do Logo
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.94);

  // 2. Idle breathing refinado (pulso milimétrico calmo 1.0 -> 1.018)
  const breathingScale = useSharedValue(1.0);
  const ambientGlowOpacity = useSharedValue(0);

  // 3. Transição de saída cinematográfica
  const exitScale = useSharedValue(1.0);
  const containerOpacity = useSharedValue(1.0);

  useEffect(() => {
    // Entrada sutil e tátil no padrão Apple/Nubank: fade in + spring suave
    logoOpacity.value = withTiming(1, {
      duration: 650,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

    logoScale.value = withSpring(1.0, {
      damping: 18,
      stiffness: 130,
      mass: 0.9,
    });

    // Brilho ambiente sutil de fundo que acorda suavemente
    ambientGlowOpacity.value = withTiming(0.16, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    // Idle breathing contínuo e suave (loop orgânico calmo)
    breathingScale.value = withRepeat(
      withSequence(
        withTiming(1.018, {
          duration: 1900,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1.0, {
          duration: 1900,
          easing: Easing.inOut(Easing.quad),
        })
      ),
      -1,
      true
    );
  }, []);

  // Transição de saída impecável quando a inicialização estiver pronta (isReady)
  useEffect(() => {
    if (isReady) {
      // 1. Desacelera a respiração para sincronizar com a expansão de saída
      breathingScale.value = withTiming(1.0, { duration: 180 });

      // 2. Leve expansão para frente (1.0 -> 1.06)
      exitScale.value = withTiming(1.06, {
        duration: 420,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });

      // 3. Fade out fluido do container revelando o app
      containerOpacity.value = withTiming(
        0,
        {
          duration: 420,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        }
      );
    }
  }, [isReady, onFinish]);

  const animatedLogoStyle = useAnimatedStyle(() => {
    const totalScale = logoScale.value * breathingScale.value * exitScale.value;
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: totalScale }],
    };
  });

  const animatedAmbientGlowStyle = useAnimatedStyle(() => ({
    opacity: ambientGlowOpacity.value * containerOpacity.value,
    transform: [{ scale: breathingScale.value * exitScale.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedContainerStyle]}
      pointerEvents={isReady ? 'none' : 'box-none'}
    >
      {/* Halo de luz ambiente suave e difuso (Aura Fintech) */}
      <Animated.View style={[styles.ambientGlow, animatedAmbientGlowStyle]} />

      {/* Logo isolada e pura, proporção 100% matemática sem distorção */}
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <Image
          source={require('../../../assets/finz-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
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
    width: LOGO_WIDTH * 1.8,
    height: LOGO_WIDTH * 1.8,
    borderRadius: (LOGO_WIDTH * 1.8) / 2,
    backgroundColor: '#2A2C38',
    // Leve difusão para profundidade OLED
    shadowColor: '#72FB02',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: LOGO_WIDTH,
    // Proporção 100% fiel à imagem original (1024 largura / 952 altura)
    aspectRatio: 1024 / 952,
  },
});
