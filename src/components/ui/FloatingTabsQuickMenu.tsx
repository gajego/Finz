import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';
import {
  Layers2,
  X,
  Home,
  BarChart2,
  Sparkles,
  Target,
  TrendingUp,
  Check,
  LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { MainTab } from './FloatingBottomNav';

interface TabOption {
  id: MainTab;
  label: string;
  icon: LucideIcon;
}

const MENU_OPTIONS: TabOption[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'performance', label: 'Desempenho', icon: BarChart2 },
  { id: 'insights', label: 'Inteligência', icon: Sparkles },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'investments', label: 'Ativos', icon: TrendingUp },
];

interface FloatingTabsQuickMenuProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
}

export const FloatingTabsQuickMenu: React.FC<FloatingTabsQuickMenuProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (tab: MainTab) => {
    onSelectTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop transparente para toque fora */}
      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsOpen(false)}
          accessibilityLabel="Fechar menu de abas"
          accessibilityRole="button"
        />
      )}

      {/* Menu Popup Flutuante acima do botão */}
      {isOpen && (
        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
          style={[
            styles.menuCard,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: colors.borderSubtle,
              shadowColor: '#000000',
            },
          ]}
        >
          <Text style={[styles.menuHeaderLabel, { color: colors.textSecondary }]}>
            SELECIONAR TELA
          </Text>

          <View style={styles.optionsList}>
            {MENU_OPTIONS.map((item) => {
              const isActive = activeTab === item.id;
              const IconComponent = item.icon;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item.id)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(59, 130, 246, 0.18)'
                          : 'rgba(59, 130, 246, 0.1)'
                        : pressed
                        ? isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)'
                        : 'transparent',
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Ir para ${item.label}`}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isActive
                          ? `${colors.primary}20`
                          : isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                    ]}
                  >
                    <IconComponent
                      size={15}
                      color={isActive ? colors.primary : colors.textSecondary}
                    />
                  </View>

                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isActive ? colors.primary : colors.text,
                        fontFamily: isActive ? Typography.bold : Typography.medium,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>

                  {isActive && (
                    <View style={styles.checkWrapper}>
                      <Check size={14} color={colors.primary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Círculo Flutuante (FAB) no Canto Inferior Direito na Cor Primária */}
      <Pressable
        onPress={() => setIsOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            borderColor: isDark ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)',
            shadowColor: colors.primary,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Menu rápido de abas"
        accessibilityHint="Abre o seletor rápido para navegar entre as telas do aplicativo"
      >
        {isOpen ? (
          <X size={20} color={colors.primaryForeground} strokeWidth={2.4} />
        ) : (
          <Layers2 size={21} color={colors.primaryForeground} strokeWidth={2.4} />
        )}
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 998,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  menuCard: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 82 : 72,
    width: 200,
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
    zIndex: 1000,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
  },
  menuHeaderLabel: {
    fontSize: 9,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  optionsList: {
    gap: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
  },
  checkWrapper: {
    marginLeft: 'auto',
  },
});
