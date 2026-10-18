import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Moon, Sun, Bell } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography } from '@/theme/typography';

interface HeaderProps {
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const profile = useWalletStore((s) => s.profile);
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const activeAlert = useWalletStore((s) => s.activeAlert);

  const hasAlert = React.useMemo(() => {
    if (activeAlert) return true;
    return categories.some((cat) => {
      if (cat.budgetLimit <= 0) return false;
      const spent = transactions
        .filter((t) => t.categoryId === cat.id && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      return spent / cat.budgetLimit >= 0.8;
    });
  }, [activeAlert, categories, transactions]);

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

      {/* Ações: Alternar Tema e Central de Notificações */}
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
          <Bell size={15} color={hasAlert ? colors.primary : colors.text} />
          {hasAlert && <View style={[styles.notificationDot, { backgroundColor: '#FF3B30' }]} />}
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
    fontFamily: Typography.bold,
    fontSize: 22,
    letterSpacing: 2,
  },
  versionBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  versionText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  userName: {
    fontFamily: Typography.medium,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

