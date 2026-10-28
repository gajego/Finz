import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/useTheme';

export type MainTab = 'home' | 'performance' | 'goals' | 'investments';

interface FloatingBottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

const TABS: { id: MainTab; label: string }[] = [
  { id: 'home', label: 'Início' },
  { id: 'performance', label: 'Desempenho' },
  { id: 'goals', label: 'Metas' },
  { id: 'investments', label: 'Ativos' },
];

const IndicatorBar: React.FC<{
  isActive: boolean;
  onPress: () => void;
  label: string;
  colors: any;
}> = ({ isActive, onPress, label, colors }) => {
  const animatedBarStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isActive ? 28 : 8, {
        duration: 220,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      backgroundColor: withTiming(
        isActive ? colors.primary : colors.surfaceSubtle,
        {
          duration: 220,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }
      ),
    };
  }, [isActive, colors.primary, colors.surfaceSubtle]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={styles.touchArea}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            borderColor: isActive ? 'transparent' : colors.borderSubtle,
          },
          animatedBarStyle,
        ]}
      />
    </Pressable>
  );
};

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[
          styles.dockPill,
          {
            backgroundColor: isDark
              ? 'rgba(14, 15, 20, 0.88)'
              : 'rgba(255, 255, 255, 0.92)',
            borderColor: colors.borderSubtle,
            shadowColor: '#000000',
          },
        ]}
      >
        {TABS.map((tab) => (
          <IndicatorBar
            key={tab.id}
            isActive={activeTab === tab.id}
            onPress={() => onTabChange(tab.id)}
            label={tab.label}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    gap: 8,
  },
  touchArea: {
    minHeight: 28,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  bar: {
    height: 4.5,
    borderRadius: 2.25,
    borderWidth: 0.5,
  },
});
