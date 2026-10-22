import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Moon, Sun, Bell, Landmark } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, LetterSpacing } from '@/theme/typography';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenPluggy?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, onOpenPluggy }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const profile = useWalletStore((s) => s.profile);
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const activeAlert = useWalletStore((s) => s.activeAlert);

  const hasAlert = useMemo(() => {
    if (activeAlert) return true;
    return categories.some((cat) => {
      if (cat.budgetLimit <= 0) return false;
      const spent = transactions
        .filter((t) => t.categoryId === cat.id && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      return spent / cat.budgetLimit >= 0.8;
    });
  }, [activeAlert, categories, transactions]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'BOM DIA';
    if (hour >= 12 && hour < 18) return 'BOA TARDE';
    return 'BOA NOITE';
  }, []);

  const initials = useMemo(() => {
    const name = profile.fullName?.trim() || 'Wesley Silva';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'FZ';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile.fullName]);

  const displayName = useMemo(() => {
    return (profile.fullName?.trim() || 'WESLEY SILVA').toUpperCase();
  }, [profile.fullName]);

  return (
    <View style={styles.container}>
      {/* Bloco de Identidade do Usuário com Avatar Squircle */}
      <View style={styles.userRow}>
        <View
          style={[
            styles.userAvatar,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.userTextCol}>
          <Text style={[styles.greetingLabel, { color: colors.textMuted }]}>
            {greeting} • PORTFÓLIO
          </Text>
          <Text style={[styles.userName, { color: colors.textSecondary }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>

      {/* Ações: Open Finance Pluggy, Alternar Tema e Notificações (Pills de Precisão) */}
      <View style={styles.actionButtons}>
        {/* Botão Conectar Conta / Open Finance (Pluggy) */}
        {onOpenPluggy && (
          <Pressable
            onPress={onOpenPluggy}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderSubtle,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            hitSlop={8}
            accessibilityLabel="Conectar conta bancária Open Finance"
          >
            <Landmark size={17} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        )}

        {/* Botão de Alternar Modo Claro/Escuro */}
        <Pressable
          onPress={toggleTheme}
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          hitSlop={8}
          accessibilityLabel="Alternar tema"
        >
          {mode === 'dark' ? (
            <Sun size={17} color={colors.primary} strokeWidth={2.2} />
          ) : (
            <Moon size={17} color={colors.text} strokeWidth={2.2} />
          )}
        </Pressable>

        {/* Botão de Central de Notificações com Glow Indicator */}
        <Pressable
          onPress={onOpenNotifications}
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          hitSlop={8}
          accessibilityLabel="Notificações"
        >
          <Bell
            size={17}
            color={hasAlert ? colors.primary : colors.text}
            strokeWidth={2.2}
          />
          {hasAlert && (
            <View style={styles.alertIndicatorContainer}>
              <View style={[styles.alertHalo, { backgroundColor: colors.danger }]} />
              <View style={[styles.alertDot, { backgroundColor: colors.danger }]} />
            </View>
          )}
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
    paddingTop: 14,
    paddingBottom: 10,
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: LetterSpacing.tight,
  },
  userTextCol: {
    flex: 1,
  },
  greetingLabel: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 1,
  },
  userName: {
    fontFamily: Typography.medium,
    fontSize: 11,
    letterSpacing: LetterSpacing.wide,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  alertIndicatorContainer: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertHalo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 4,
    opacity: 0.35,
    transform: [{ scale: 1.6 }],
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
