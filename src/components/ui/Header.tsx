import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Moon, Sun, Bell, Terminal } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';

interface HeaderProps {
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const profile = useWalletStore((s) => s.profile);

  return (
    <View style={styles.container}>
      {/* Logotipo e Usuário */}
      <View>
        <View style={styles.logoRow}>
          <Text style={[styles.brandLogo, { color: colors.text }]}>FINZ</Text>
          <View style={[styles.versionBadge, { borderColor: colors.borderStrong }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>CORE v1.0</Text>
          </View>
        </View>
        <Text style={[styles.userName, { color: colors.textSecondary }]}>
          PORTFÓLIO DE {profile.fullName.toUpperCase() || 'WESLEY SILVA'}
        </Text>
      </View>

      {/* Ações: Alternar Tema e Simulador de Eventos */}
      <View style={styles.actionButtons}>
        <Pressable
          onPress={toggleTheme}
          style={[
            styles.actionPill,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
          hitSlop={8}
        >
          {mode === 'dark' ? (
            <Sun size={15} color={colors.primary} />
          ) : (
            <Moon size={15} color={colors.text} />
          )}
        </Pressable>

        <Pressable
          onPress={onOpenNotifications}
          style={[
            styles.actionPill,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
          hitSlop={8}
        >
          <Terminal size={15} color={colors.text} />
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
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  brandLogo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
  },
  versionBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
