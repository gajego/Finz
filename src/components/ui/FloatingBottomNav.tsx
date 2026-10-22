import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Home, Target } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

export type MainTab = 'home' | 'goals';

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
            size={17}
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

        {/* Separador Sutil */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' },
          ]}
        />

        {/* Aba 2: Metas */}
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
            size={17}
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 36,
    borderWidth: 1.5,
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 28,
    gap: 8,
  },
  activeTabItem: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 18,
  },
});
