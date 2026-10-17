import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Moon, Sun, Bell, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';

interface HeaderProps {
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const profile = useWalletStore((s) => s.profile);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.badgeRow}>
          <ShieldCheck size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Local-First Seguro</Text>
        </View>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()},</Text>
        <Text style={[styles.name, { color: colors.text }]}>
          {profile.nickname || 'Wesley'} ✨
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={toggleTheme}
          style={[
            styles.iconButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          {mode === 'dark' ? (
            <Sun size={20} color={colors.primary} />
          ) : (
            <Moon size={20} color={colors.text} />
          )}
        </Pressable>

        <Pressable
          onPress={onOpenNotifications}
          style={[
            styles.iconButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <Bell size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
