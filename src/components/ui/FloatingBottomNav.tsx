import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Home, TrendingUp, Target, Briefcase } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

export type MainTab = 'home' | 'performance' | 'goals' | 'investments';

interface FloatingBottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

interface TabButtonProps {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  isActive: boolean;
  onPress: () => void;
  colors: any;
}

const TabButton: React.FC<TabButtonProps> = ({
  label,
  Icon,
  isActive,
  onPress,
  colors,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.03, { damping: 12, stiffness: 260 }, () => {
        scale.value = withSpring(1, { damping: 14, stiffness: 200 });
      });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 14, stiffness: 350 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 250 });
        }}
        style={[
          styles.tabItem,
          isActive && [
            styles.activeTabItem,
            { backgroundColor: colors.primary },
          ],
        ]}
        hitSlop={8}
      >
        <Icon
          size={16}
          color={isActive ? colors.primaryForeground : colors.textSecondary}
          strokeWidth={isActive ? 2.4 : 2}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isActive ? colors.primaryForeground : colors.textSecondary,
              fontFamily: isActive ? Typography.bold : Typography.medium,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
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
              ? 'rgba(24, 24, 27, 0.94)'
              : 'rgba(255, 255, 255, 0.96)',
            borderColor: colors.borderStrong,
            shadowColor: '#000000',
          },
        ]}
      >
        {/* Aba 1: Início */}
        <TabButton
          label="Início"
          Icon={Home}
          isActive={activeTab === 'home'}
          onPress={() => onTabChange('home')}
          colors={colors}
        />

        {/* Separador Sutil 1 */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' },
          ]}
        />

        {/* Aba 2: Desempenho */}
        <TabButton
          label="Desempenho"
          Icon={TrendingUp}
          isActive={activeTab === 'performance'}
          onPress={() => onTabChange('performance')}
          colors={colors}
        />

        {/* Separador Sutil 2 */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' },
          ]}
        />

        {/* Aba 3: Metas */}
        <TabButton
          label="Metas"
          Icon={Target}
          isActive={activeTab === 'goals'}
          onPress={() => onTabChange('goals')}
          colors={colors}
        />

        {/* Separador Sutil 3 */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' },
          ]}
        />

        {/* Aba 4: Investimentos */}
        <TabButton
          label="Ativos"
          Icon={Briefcase}
          isActive={activeTab === 'investments'}
          onPress={() => onTabChange('investments')}
          colors={colors}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 36,
    borderWidth: 1.5,
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    gap: 2,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  activeTabItem: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  divider: {
    width: 1,
    height: 16,
  },
});
