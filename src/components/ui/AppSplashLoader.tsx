import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
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
import { Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AppSplashLoaderProps {
  isReady: boolean;
  onFinish: () => void;
}

export const AppSplashLoader: React.FC<AppSplashLoaderProps> = ({ isReady, onFinish }) => {
  // Animações de entrada e presença
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const progressWidth = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Entrada suave da logo
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 180 });

    // 2. Pulso sutil de glow tipo fintech
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3. Barra de progresso animada
    progressWidth.value = withTiming(0.85, {
      duration: 1100,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  // Quando o app estiver pronto, completa a barra e faz fadeout cinematográfico
  useEffect(() => {
    if (isReady) {
      // Avança a barra para 100%
      progressWidth.value = withTiming(1, { duration: 300 }, () => {
        // Fade out suave
        containerOpacity.value = withTiming(
          0,
          { duration: 450, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(onFinish)();
            }
          }
        );
      });
    }
  }, [isReady]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]} pointerEvents="box-none">
      {/* Halo de luz / Glow Neon de fundo */}
      <Animated.View style={[styles.glowRing, animatedGlowStyle]} />

      <Animated.View style={[styles.brandContainer, animatedLogoStyle]}>
        {/* Ícone com borda neo-fintech */}
        <View style={styles.iconWrapper}>
          <Image
            source={require('../../../assets/icon-dark.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Título de Marca */}
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>FINZ</Text>
          <View style={styles.badgeSpark}>
            <Sparkles size={11} color="#D9F920" strokeWidth={2.5} />
          </View>
        </View>

        <Text style={styles.brandSubtitle}>GESTÃO INTELIGENTE</Text>
      </Animated.View>

      {/* Barra de Carregamento Inferior Minimalista (Estilo Nubank / Linear) */}
      <View style={styles.footerLoader}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
        </View>
        <Text style={styles.loadingText}>Conectando seus dados...</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#040405',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#D9F920',
    opacity: 0.1,
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#0D0E12',
    borderWidth: 1.5,
    borderColor: 'rgba(217, 249, 32, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D9F920',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  badgeSpark: {
    backgroundColor: 'rgba(217, 249, 32, 0.15)',
    padding: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(217, 249, 32, 0.3)',
  },
  brandSubtitle: {
    color: '#8E929E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.5,
    marginTop: 6,
  },
  footerLoader: {
    position: 'absolute',
    bottom: 56,
    width: width * 0.58,
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D9F920',
    borderRadius: 2,
    shadowColor: '#D9F920',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
