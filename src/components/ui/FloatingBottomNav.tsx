import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Home, TrendingUp, Target } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

export type MainTab = 'home' | 'performance' | 'goals';

interface FloatingBottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

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
        <Pressable
          onPress={() => onTabChange('home')}
          style={({ pressed }) => [
            styles.tabItem,
            activeTab === 'home' && [
              styles.activeTabItem,
              { backgroundColor: colors.primary },
            ],
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
          hitSlop={8}
        >
          <Home
            size={16}
            color={
              activeTab === 'home'
                ? colors.primaryForeground
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  activeTab === 'home'
                    ? colors.primaryForeground
                    : colors.textSecondary,
                fontFamily: activeTab === 'home' ? Typography.bold : Typography.medium,
              },
            ]}
          >
            Início
          </Text>
        </Pressable>

        {/* Separador Sutil 1 */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' },
          ]}
        />

        {/* Aba 2: Desempenho */}
        <Pressable
          onPress={() => onTabChange('performance')}
          style={({ pressed }) => [
            styles.tabItem,
            activeTab === 'performance' && [
              styles.activeTabItem,
              { backgroundColor: colors.primary },
            ],
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
          hitSlop={8}
        >
          <TrendingUp
            size={16}
            color={
              activeTab === 'performance'
                ? colors.primaryForeground
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  activeTab === 'performance'
                    ? colors.primaryForeground
                    : colors.textSecondary,
                fontFamily: activeTab === 'performance' ? Typography.bold : Typography.medium,
              },
            ]}
          >
            Desempenho
          </Text>
        </Pressable>

        {/* Separador Sutil 2 */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' },
          ]}
        />

        {/* Aba 3: Metas */}
        <Pressable
          onPress={() => onTabChange('goals')}
          style={({ pressed }) => [
            styles.tabItem,
            activeTab === 'goals' && [
              styles.activeTabItem,
              { backgroundColor: colors.primary },
            ],
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
          hitSlop={8}
        >
          <Target
            size={16}
            color={
              activeTab === 'goals'
                ? colors.primaryForeground
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  activeTab === 'goals'
                    ? colors.primaryForeground
                    : colors.textSecondary,
                fontFamily: activeTab === 'goals' ? Typography.bold : Typography.medium,
              },
            ]}
          >
            Metas
          </Text>
        </Pressable>
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
