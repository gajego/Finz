import React, { useRef, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Radii } from '@/theme/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UseSwipeModalDismissOptions {
  onClose: () => void;
  visible?: boolean;
  threshold?: number;
}

export function useSwipeModalDismiss({
  onClose,
  visible = true,
  threshold = 65,
}: UseSwipeModalDismissOptions) {
  const panY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      panY.setValue(0);
    }
  }, [visible]);

  const dismissUp = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(panY, {
      toValue: -SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
        setTimeout(() => {
          if (isClosingRef.current) {
            isClosingRef.current = false;
            panY.setValue(0);
          }
        }, 500);
      } else {
        isClosingRef.current = false;
      }
    });
  };

  const dismissDown = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(panY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
        setTimeout(() => {
          if (isClosingRef.current) {
            isClosingRef.current = false;
            panY.setValue(0);
          }
        }, 500);
      } else {
        isClosingRef.current = false;
      }
    });
  };

  // Responde imediatamente em áreas dedicadas (alças superior e inferior)
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3;
      },
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -threshold || gestureState.vy < -0.4) {
          dismissUp();
        } else if (gestureState.dy > threshold || gestureState.vy > 0.4) {
          dismissDown();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panY, {
          toValue: 0,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Responde no header mas não intercepta cliques em botões (X, Voltar, Copiar)
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -threshold || gestureState.vy < -0.4) {
          dismissUp();
        } else if (gestureState.dy > threshold || gestureState.vy > 0.4) {
          dismissDown();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panY, {
          toValue: 0,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const animatedSheetStyle = {
    transform: [{ translateY: panY }],
    opacity: panY.interpolate({
      inputRange: [-SCREEN_HEIGHT * 0.45, 0, SCREEN_HEIGHT * 0.45],
      outputRange: [0, 1, 0],
      extrapolate: 'clamp' as const,
    }),
  };

  return {
    panY,
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
    dismissUp,
    dismissDown,
  };
}

export const ModalTopHandle: React.FC<{
  panHandlers: any;
  color?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ panHandlers, color, style }) => {
  const { colors } = useTheme();
  return (
    <View {...panHandlers} style={[styles.topHandleContainer, style]}>
      <View style={[styles.handleBar, { backgroundColor: color || colors.borderStrong }]} />
    </View>
  );
};

export const ModalBottomHandle: React.FC<{
  panHandlers: any;
  color?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ panHandlers, color, style }) => {
  const { colors } = useTheme();
  return (
    <View {...panHandlers} style={[styles.bottomHandleContainer, style]}>
      <View style={[styles.bottomHandleBar, { backgroundColor: color || colors.borderStrong }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  topHandleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: Radii.full,
  },
  bottomHandleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  bottomHandleBar: {
    width: 48,
    height: 4,
    borderRadius: Radii.full,
    opacity: 0.6,
  },
});
