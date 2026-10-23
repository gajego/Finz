import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Moon, Sun, Bell, Landmark, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, LetterSpacing } from '@/theme/typography';

interface HeaderProps {
  onOpenNotifications?: () => void;
  onOpenPluggy?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications, onOpenPluggy, onOpenProfile }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const profile = useWalletStore((s) => s.profile);
  const cards = useWalletStore((s) => s.cards);
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
    const name = profile.fullName?.trim() || 'Wesley Souza';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'FZ';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile.fullName]);

  const displayName = useMemo(() => {
    return (profile.fullName?.trim() || 'WESLEY SOUZA').toUpperCase();
  }, [profile.fullName]);

  const hasActiveSync = cards.length > 0;

  return (
    <View style={styles.container}>
      {/* Bloco Tátil de Identidade do Usuário (Design Neo-Fintech Pill) */}
      <Pressable
        onPress={onOpenProfile}
        style={({ pressed }) => [
          styles.profileButtonPill,
          {
            backgroundColor: pressed ? colors.surfaceSubtle : colors.surfaceElevated,
            borderColor: colors.borderSubtle,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        hitSlop={{ top: 6, bottom: 6, left: 8, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${profile.fullName?.trim() || 'Usuário'}, toque para abrir configurações`}
        accessibilityHint="Abre o menu de configurações da conta e preferências"
      >
        {/* Avatar Squircle de Alta Precisão com Status Dot */}
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.userAvatar,
              {
                backgroundColor: `${colors.primary}15`,
                borderColor: `${colors.primary}35`,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
          {hasActiveSync && (
            <View style={[styles.statusDotRing, { backgroundColor: colors.surfaceElevated }]}>
              <View style={[styles.statusDot, { backgroundColor: '#00D09E' }]} />
            </View>
          )}
        </View>

        {/* Hierarquia Tipográfica de Prestígio */}
        <View style={styles.userTextCol}>
          <View style={styles.microLabelRow}>
            <Text style={[styles.greetingLabel, { color: colors.textMuted }]}>
              {greeting}
            </Text>
            <View style={[styles.microStatusDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.statusLabel, { color: colors.primary }]}>
              PORTFÓLIO
            </Text>
          </View>
          <Text
            style={[styles.userName, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayName}
          </Text>
        </View>

        {/* Indicador de Affordance Direcional */}
        <ChevronRight size={13} color={colors.textMuted} strokeWidth={2.4} style={styles.chevron} />
      </Pressable>

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
                transform: [{ scale: pressed ? 0.90 : 1 }],
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
              transform: [{ scale: pressed ? 0.90 : 1 }],
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
              transform: [{ scale: pressed ? 0.90 : 1 }],
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
    gap: 10,
  },
  profileButtonPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Typography.bold,
    fontSize: 12.5,
    letterSpacing: LetterSpacing.tight,
    fontVariant: ['tabular-nums'],
  },
  statusDotRing: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  userTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  microLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  greetingLabel: {
    fontFamily: Typography.bold,
    fontSize: 8.5,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  microStatusDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  statusLabel: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },
  userName: {
    fontFamily: Typography.bold,
    fontSize: 13,
    letterSpacing: LetterSpacing.normal,
  },
  chevron: {
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
