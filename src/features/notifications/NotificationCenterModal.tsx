import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import {
  X,
  Bell,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Sliders,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToBudgets?: (categoryId?: string) => void;
  onNavigateToAddCard?: () => void;
}

type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

interface SystemNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  description: string;
  tag: string;
  timestamp: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  visible,
  onClose,
  onNavigateToBudgets,
  onNavigateToAddCard,
}) => {
  const { colors, mode } = useTheme();
  const categories = useWalletStore((s) => s.categories);
  const transactions = useWalletStore((s) => s.transactions);
  const cards = useWalletStore((s) => s.cards);

  const [activeTab, setActiveTab] = useState<'ALL' | 'ALERTS'>('ALL');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const notifications = useMemo<SystemNotification[]>(() => {
    const list: SystemNotification[] = [];

    // 1. Alertas Reais de Tetos e Metas por Categoria
    categories.forEach((cat) => {
      if (cat.budgetLimit > 0) {
        const spent = transactions
          .filter((t) => t.categoryId === cat.id && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);

        const percent = Math.round((spent / cat.budgetLimit) * 100);

        if (spent >= cat.budgetLimit) {
          list.push({
            id: `cat_exceeded_${cat.id}`,
            severity: 'critical',
            title: `Teto Excedido: ${cat.name}`,
            description: `Você ultrapassou o teto estipulado de ${formatBRL(cat.budgetLimit)}. Total consumido: ${formatBRL(spent)} (${percent}%).`,
            tag: 'ORÇAMENTO',
            timestamp: 'Este mês',
            actionLabel: 'Reajustar Teto',
            onAction: () => {
              onClose();
              onNavigateToBudgets?.(cat.id);
            },
          });
        } else if (percent >= 80) {
          list.push({
            id: `cat_warning_${cat.id}`,
            severity: 'warning',
            title: `Atenção: ${cat.name} em ${percent}%`,
            description: `Você já consumiu ${percent}% do orçamento mensal (${formatBRL(spent)} de ${formatBRL(cat.budgetLimit)}).`,
            tag: 'ORÇAMENTO',
            timestamp: 'Este mês',
            actionLabel: 'Gerenciar Meta',
            onAction: () => {
              onClose();
              onNavigateToBudgets?.(cat.id);
            },
          });
        }
      }
    });

    // 2. Alertas Reais de Cartões de Crédito Próximos ao Limite
    cards.forEach((card) => {
      if (card.limit > 0) {
        const spentOnCard = transactions
          .filter((t) => t.cardId === card.id && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);

        const cardPercent = Math.round((spentOnCard / card.limit) * 100);

        if (cardPercent >= 85) {
          list.push({
            id: `card_limit_${card.id}`,
            severity: 'warning',
            title: `Limite Alto: ${card.bankName}`,
            description: `Cartão final ${card.lastFourDigits} atingiu ${cardPercent}% do limite total de ${formatBRL(card.limit)}.`,
            tag: 'CARTÃO',
            timestamp: 'Fatura atual',
          });
        }
      }
    });

    // 3. Notificações Reais do Status da Carteira
    if (cards.length === 0) {
      list.push({
        id: 'status_no_cards',
        severity: 'info',
        title: 'Nenhum cartão cadastrado',
        description: 'Vincule seu primeiro cartão (Nubank, Itaú, Inter...) para automatizar o controle de gastos e conciliação.',
        tag: 'CARTEIRA',
        timestamp: 'Recomendação',
        actionLabel: 'Cadastrar Cartão',
        onAction: () => {
          onClose();
          onNavigateToAddCard?.();
        },
      });
    }

    const hasAnyBudgetSet = categories.some((c) => c.budgetLimit > 0);
    if (!hasAnyBudgetSet && categories.length > 0) {
      list.push({
        id: 'status_no_budgets',
        severity: 'info',
        title: 'Defina metas por categoria',
        description: 'Configure os limites mensais das suas categorias para receber alertas inteligentes em tempo real.',
        tag: 'CONFIGURAÇÃO',
        timestamp: 'Dica do sistema',
        actionLabel: 'Definir Metas',
        onAction: () => {
          onClose();
          onNavigateToBudgets?.();
        },
      });
    }

    // 4. Últimas atividades reais registradas (até 5 eventos recentes)
    if (transactions.length > 0) {
      const recentTxs = transactions.slice(0, 5);
      recentTxs.forEach((tx) => {
        const isRefund = tx.type === 'REFUND';
        const card = cards.find((c) => c.id === tx.cardId);
        const dateObj = new Date(tx.timestamp);
        const dateStr = dateObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        list.push({
          id: `tx_audit_${tx.id}`,
          severity: isRefund ? 'success' : 'info',
          title: isRefund ? 'Estorno / Depósito' : 'Nova Movimentação',
          description: `${tx.merchant} • ${formatBRL(tx.amount)}${card ? ` • ${card.bankName}` : ''}`,
          tag: 'ATIVIDADE',
          timestamp: dateStr,
        });
      });
    }

    return list;
  }, [categories, transactions, cards, onClose, onNavigateToBudgets, onNavigateToAddCard]);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => !dismissedIds.has(n.id))
      .filter((n) => {
        if (activeTab === 'ALERTS') {
          return n.severity === 'critical' || n.severity === 'warning';
        }
        return true;
      });
  }, [notifications, dismissedIds, activeTab]);

  const alertCount = useMemo(() => {
    return notifications.filter(
      (n) => (n.severity === 'critical' || n.severity === 'warning') && !dismissedIds.has(n.id)
    ).length;
  }, [notifications, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const getSeverityColors = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          iconColor: '#FF3B30',
          bg: 'rgba(255, 59, 48, 0.08)',
          border: '#FF3B30',
          tagBg: 'rgba(255, 59, 48, 0.18)',
          tagText: '#FF3B30',
        };
      case 'warning':
        return {
          iconColor: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.08)',
          border: '#F59E0B',
          tagBg: 'rgba(245, 158, 11, 0.18)',
          tagText: '#F59E0B',
        };
      case 'success':
        return {
          iconColor: colors.primary,
          bg: mode === 'dark' ? 'rgba(217, 249, 32, 0.06)' : 'rgba(9, 10, 12, 0.04)',
          border: colors.primary,
          tagBg: colors.surfaceSubtle,
          tagText: colors.primary,
        };
      case 'info':
      default:
        return {
          iconColor: colors.textSecondary,
          bg: mode === 'dark' ? colors.background : colors.surface,
          border: colors.border,
          tagBg: colors.surfaceSubtle,
          tagText: colors.textSecondary,
        };
    }
  };

  const renderIcon = (severity: NotificationSeverity) => {
    const iconSize = 16;
    switch (severity) {
      case 'critical':
        return <AlertCircle size={iconSize} color="#FF3B30" />;
      case 'warning':
        return <AlertTriangle size={iconSize} color="#F59E0B" />;
      case 'success':
        return <CheckCircle2 size={iconSize} color={colors.primary} />;
      case 'info':
      default:
        return <Bell size={iconSize} color={colors.textSecondary} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          {/* Barra Superior de Arrasto Visual */}
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.borderStrong }]} />
          </View>

          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.surfaceSubtle }]}>
                <Bell size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>CENTRAL DE NOTIFICAÇÕES</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  AVISOS E MONITORAMENTO EM TEMPO REAL
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}
            >
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          {/* Abas de Filtro: TODAS / ALERTAS */}
          <View style={styles.tabsRow}>
            <Pressable
              onPress={() => setActiveTab('ALL')}
              style={[
                styles.tabPill,
                activeTab === 'ALL'
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'ALL' ? colors.primaryForeground : colors.textSecondary },
                ]}
              >
                TODAS ({notifications.filter((n) => !dismissedIds.has(n.id)).length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('ALERTS')}
              style={[
                styles.tabPill,
                activeTab === 'ALERTS'
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'ALERTS' ? colors.primaryForeground : colors.textSecondary },
                ]}
              >
                ALERTAS {alertCount > 0 ? `(${alertCount})` : ''}
              </Text>
              {alertCount > 0 && (
                <View style={[styles.badgeDot, { backgroundColor: '#FF3B30' }]} />
              )}
            </Pressable>
          </View>

          {/* Lista de Notificações ou Estado Vazio */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredNotifications.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                  <Bell size={26} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>TUDO EM DIA</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {activeTab === 'ALERTS'
                    ? 'Nenhum alerta crítico ativo no momento. Suas despesas estão dentro dos tetos estipulados.'
                    : 'Você não possui notificações pendentes. Suas finanças e limites estão sob controle.'}
                </Text>

                <View
                  style={[
                    styles.operationalPill,
                    {
                      backgroundColor:
                        mode === 'dark'
                          ? 'rgba(217, 249, 32, 0.08)'
                          : 'rgba(9, 10, 12, 0.05)',
                      borderColor: colors.borderStrong,
                    },
                  ]}
                >
                  <ShieldCheck size={12} color={colors.primary} />
                  <Text style={[styles.operationalText, { color: colors.primary }]}>
                    SISTEMA SEGURO & OPERACIONAL
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {filteredNotifications.map((item) => {
                  const palette = getSeverityColors(item.severity);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.notificationCard,
                        {
                          backgroundColor: palette.bg,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <View style={styles.cardTop}>
                        <View style={styles.cardHeaderLeft}>
                          {renderIcon(item.severity)}
                          <View
                            style={[
                              styles.tagBadge,
                              { backgroundColor: palette.tagBg },
                            ]}
                          >
                            <Text style={[styles.tagText, { color: palette.tagText }]}>
                              {item.tag}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardHeaderRight}>
                          <Text style={[styles.timestampText, { color: colors.textMuted }]}>
                            {item.timestamp}
                          </Text>
                          <Pressable
                            onPress={() => handleDismiss(item.id)}
                            hitSlop={8}
                            style={styles.dismissBtn}
                          >
                            <Check size={13} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      </View>

                      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>

                      {item.actionLabel && item.onAction && (
                        <Pressable
                          onPress={item.onAction}
                          style={[
                            styles.actionButton,
                            {
                              backgroundColor:
                                item.severity === 'critical' ? '#FF3B30' : colors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.actionButtonText,
                              {
                                color:
                                  item.severity === 'critical'
                                    ? '#FFFFFF'
                                    : colors.primaryForeground,
                              },
                            ]}
                          >
                            {item.actionLabel.toUpperCase()}
                          </Text>
                          <ChevronRight
                            size={12}
                            color={
                              item.severity === 'critical'
                                ? '#FFFFFF'
                                : colors.primaryForeground
                            }
                          />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontFamily: Typography.medium,
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  timestampText: {
    fontFamily: Typography.regular,
    fontSize: 10,
  },
  dismissBtn: {
    padding: 2,
  },
  cardTitle: {
    fontFamily: Typography.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: Typography.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 12,
  },
  actionButtonText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  emptyContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: Typography.bold,
    fontSize: 14,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  operationalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  operationalText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
});
