import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';
import { Typography, LetterSpacing } from '@/theme/typography';

export type PulseLoaderSize = 'small' | 'medium' | 'large' | number;
export type PulseLoaderVariant = 'spinner' | 'pulse' | 'orbit';

interface PulseLoaderProps {
  size?: PulseLoaderSize;
  color?: string;
  secondaryColor?: string;
  message?: string;
  variant?: PulseLoaderVariant;
}

export const PulseLoader: React.FC<PulseLoaderProps> = ({
  size = 'medium',
  color,
  secondaryColor,
  message,
  variant = 'spinner',
}) => {
  const { colors } = useTheme();

  const primaryColor = color || colors.primary;
  const accentColor = secondaryColor || colors.borderStrong;

  // Resolução da dimensão numérica
  const dimension =
    typeof size === 'number'
      ? size
      : size === 'small'
      ? 28
      : size === 'large'
      ? 64
      : 44;

  const strokeWidth = dimension <= 32 ? 2.5 : 3.5;
  const radius = (dimension - strokeWidth * 2) / 2;
  const center = dimension / 2;
  const circumference = 2 * Math.PI * radius;

  // Animações Reanimated de 60/120 fps
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1100, easing: Easing.linear }),
      -1,
      false
    );

    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      true
    );

    orbitAngle.value = withRepeat(
      withTiming(360, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation, pulse, orbitAngle]);

  const animatedSpinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [0.85, 1.15]);
    const opacity = interpolate(pulse.value, [0, 1], [0.35, 0.95]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const animatedCoreGlow = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [0.75, 1.1]);
    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: dimension, height: dimension, alignItems: 'center', justifyContent: 'center' }}>
        {/* Camada de Halo / Pulso de fundo */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.haloContainer,
            animatedPulseStyle,
          ]}
        >
          <View
            style={[
              styles.haloCircle,
              {
                width: dimension,
                height: dimension,
                borderRadius: dimension / 2,
                borderColor: primaryColor,
              },
            ]}
          />
        </Animated.View>

        {/* Anel de precisão rotativo com arco chanfrado */}
        <Animated.View style={[{ width: dimension, height: dimension }, animatedSpinnerStyle]}>
          <Svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
            <Defs>
              <LinearGradient id="loaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
                <Stop offset="65%" stopColor={primaryColor} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Trilho de fundo suave */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeOpacity={0.25}
              fill="none"
            />

            {/* Arco com gradiente de alta precisão */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#loaderGrad)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference * 0.72} ${circumference * 0.28}`}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Ponto focal de diamante / prisma neo-fintech no centro */}
        <Animated.View
          style={[
            styles.centerPrism,
            {
              width: Math.max(5, dimension * 0.16),
              height: Math.max(5, dimension * 0.16),
              backgroundColor: primaryColor,
              borderRadius: Math.max(2, (dimension * 0.16) / 3),
            },
            animatedCoreGlow,
          ]}
        />
      </View>

      {/* Rótulo de status elegante */}
      {Boolean(message) && (
        <View style={styles.messageBox}>
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>
            {message?.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
};

export default PulseLoader;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  haloContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloCircle: {
    borderWidth: 1.5,
    opacity: 0.28,
  },
  centerPrism: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  messageBox: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  messageText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
    textAlign: 'center',
  },
});
