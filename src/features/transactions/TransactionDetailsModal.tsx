import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Copy,
  Check,
  CreditCard,
  Calendar,
  Clock,
  Tag,
  ShieldCheck,
  Building2,
  Layers,
  FileText,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  Car,
  Gamepad2,
  ShoppingBag,
  TrendingUp,
  MoreHorizontal,
  HelpCircle,
  LucideIcon,
} from 'lucide-react-native';
import { Transaction, Category, BankCard } from '@/types';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, LetterSpacing, Radii } from '@/theme/typography';
import {
  formatBRL,
  formatTime,
  parseMerchantAndInstallments,
  BRAZIL_TIMEZONE,
  getBrazilDateParts,
  getPaymentModality,
} from './transactionUtils';
import { getCategoryIconComponent } from '@/features/categories/categoryIcons';

interface TransactionDetailsModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  console.log('[TransactionDetailsModal] render: visible =', visible, 'tx =', transaction?.id);
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const cards = useWalletStore((s) => s.cards);
  const categories = useWalletStore((s) => s.categories);
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const updateTransactionCategory = useWalletStore((s) => s.updateTransactionCategory);

  const [copiedId, setCopiedId] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!transaction) {
    return null;
  }

  const card: BankCard | undefined = cards.find((c) => c.id === transaction.cardId);
  const currentCategory: Category | undefined = categories.find(
    (c) => c.id === transaction.categoryId
  );

  const isRefund = transaction.type === 'REFUND';
  const isIncome = transaction.type === 'PIX_IN';
  const isPixOut = transaction.type === 'PIX_OUT';

  const { cleanName, installment } = parseMerchantAndInstallments(
    transaction.merchant,
    transaction.rawText
  );

  const paymentModality = getPaymentModality(
    transaction.type,
    transaction.rawText,
    transaction.merchant,
    !!installment
  );

  // Paleta de status no padrão Neo-Fintech
  const coralRed = isDark ? '#F87171' : '#E11D48';
  const mintGreen = isDark ? '#34D399' : '#059669';
  const amberWarning = isDark ? '#F59E0B' : '#D97706';
  const electricBlue = isDark ? '#60A5FA' : '#2563EB';

  let amountColor = coralRed;
  let signPrefix = '- ';
  let statusBadgeText = 'DESPESA • CONCLUÍDA';
  let statusBadgeBg = isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(225, 29, 72, 0.08)';
  let statusBadgeBorder = isDark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(225, 29, 72, 0.2)';
  let StatusIcon: LucideIcon = ArrowUpRight;

  if (isRefund) {
    amountColor = amberWarning;
    signPrefix = '+ ';
    statusBadgeText = 'ESTORNO • CONCLUÍDO';
    statusBadgeBg = isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(217, 119, 6, 0.08)';
    statusBadgeBorder = isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(217, 119, 6, 0.2)';
    StatusIcon = RotateCcw;
  } else if (isIncome) {
    amountColor = mintGreen;
    signPrefix = '+ ';
    statusBadgeText = 'PIX RECEBIDO • CONCLUÍDO';
    statusBadgeBg = isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(5, 150, 105, 0.08)';
    statusBadgeBorder = isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(5, 150, 105, 0.2)';
    StatusIcon = ArrowDownLeft;
  } else if (isPixOut) {
    amountColor = coralRed;
    signPrefix = '- ';
    statusBadgeText = 'PIX ENVIADO • CONCLUÍDO';
    statusBadgeBg = isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(225, 29, 72, 0.08)';
    statusBadgeBorder = isDark ? 'rgba(248, 113, 113, 0.3)' : 'rgba(225, 29, 72, 0.2)';
    StatusIcon = ArrowUpRight;
  }

  // Data e hora detalhados em horário de Brasília
  const dateParts = getBrazilDateParts(transaction.timestamp);
  const MONTHS_FULL = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const fullDateStr = `${dateParts.day} de ${MONTHS_FULL[dateParts.month]} de ${dateParts.year}`;
  const timeStr = formatTime(transaction.timestamp);

  // Período do dia baseado no horário de Brasília
  const hourNum = parseInt(timeStr.split(':')[0], 10);
  let timePeriod = 'Dia';
  if (hourNum >= 5 && hourNum < 12) timePeriod = 'Manhã';
  else if (hourNum >= 12 && hourNum < 18) timePeriod = 'Tarde';
  else if (hourNum >= 18 || hourNum < 5) timePeriod = 'Noite';

  // Handler de alteração da categoria
  const handleSelectCategory = (newCatId: string) => {
    if (newCatId === transaction.categoryId) return;
    updateTransactionCategory(transaction.id, newCatId);
    const targetCat = categories.find((c) => c.id === newCatId);
    setSuccessNotice(`Categoria alterada para ${targetCat?.name || 'Nova Categoria'}`);
    setTimeout(() => {
      setSuccessNotice(null);
    }, 2800);
  };

  const handleCopyId = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const ActiveCategoryIcon = getCategoryIconComponent(currentCategory?.icon);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdropArea}
          onPress={onClose}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Fechar modal"
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          {/* Barra Superior de Arrasto Visual */}
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.borderStrong }]} />
          </View>

          {/* Barra Superior de Ações */}
          <View style={[styles.headerBar, { borderBottomColor: colors.borderSubtle }]}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ArrowLeft size={18} color={colors.text} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
              DETALHES DA MOVIMENTAÇÃO
            </Text>

            <Pressable
              onPress={handleCopyId}
              hitSlop={12}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Copiar ID da transação"
              style={({ pressed }) => [
                styles.copyButton,
                {
                  backgroundColor: copiedId ? colors.successSubtle : colors.surfaceElevated,
                  borderColor: copiedId ? colors.success : colors.borderSubtle,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {copiedId ? (
                <Check size={16} color={colors.success} />
              ) : (
                <Copy size={16} color={colors.textSecondary} />
              )}
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Alerta de confirmação após alterar categoria */}
            {successNotice && (
              <View
                style={[
                  styles.noticeBanner,
                  { backgroundColor: colors.successSubtle, borderColor: colors.success },
                ]}
              >
                <Check size={15} color={colors.success} />
                <Text style={[styles.noticeText, { color: colors.success }]}>{successNotice}</Text>
              </View>
            )}

            {/* Hero: Ícone, Nome do Estabelecimento e Valor */}
            <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}>
              <View
                style={[
                  styles.heroIconSquircle,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceSubtle,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.borderSubtle,
                  },
                ]}
              >
                <ActiveCategoryIcon
                  size={32}
                  color={currentCategory?.color || colors.primary}
                />
              </View>

              <Text style={[styles.merchantTitle, { color: colors.text }]} numberOfLines={2}>
                {cleanName}
              </Text>

              {transaction.rawText && transaction.rawText !== cleanName && (
                <Text style={[styles.rawMerchantText, { color: colors.textMuted }]} numberOfLines={1}>
                  {transaction.rawText.replace(/^pluggy:\s*/i, '')}
                </Text>
              )}

              <View style={styles.amountContainer}>
                <Text style={[styles.amountValue, { color: amountColor }]}>
                  {signPrefix}
                  {formatBRL(transaction.amount, privacyMode)}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBadgeBg, borderColor: statusBadgeBorder },
                ]}
              >
                <StatusIcon size={13} color={amountColor} style={{ marginRight: 6 }} />
                <Text style={[styles.statusBadgeText, { color: amountColor }]}>
                  {statusBadgeText}
                </Text>
              </View>
            </View>

            {/* Seção 1: Categoria Editável */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Tag size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  CATEGORIA DE GASTO (TOQUE PARA ALTERAR)
                </Text>
              </View>

              <View
                style={[
                  styles.categoryGridCard,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.categoryChipsGrid}>
                  {categories.map((cat) => {
                    const isSelected = transaction.categoryId === cat.id;
                    const CatIcon = getCategoryIconComponent(cat.icon);
                    const catColor = cat.color || colors.primary;

                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => handleSelectCategory(cat.id)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Categoria ${cat.name}${isSelected ? ', selecionada' : ''}`}
                        accessibilityHint="Toque para classificar esta transação nesta categoria"
                        style={({ pressed }) => [
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(217, 249, 32, 0.12)'
                                : 'rgba(0, 0, 0, 0.06)'
                              : isDark
                              ? 'rgba(255, 255, 255, 0.03)'
                              : colors.surfaceElevated,
                            borderColor: isSelected
                              ? colors.primary
                              : isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : colors.borderSubtle,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryIconCircle,
                            {
                              backgroundColor: isSelected
                                ? catColor
                                : isDark
                                ? 'rgba(255, 255, 255, 0.06)'
                                : colors.surfaceSubtle,
                            },
                          ]}
                        >
                          <CatIcon
                            size={15}
                            color={isSelected ? '#000000' : isDark ? colors.textSecondary : catColor}
                          />
                        </View>
                        <Text
                          style={[
                            styles.categoryChipLabel,
                            {
                              color: isSelected ? colors.text : colors.textSecondary,
                              fontFamily: isSelected ? Typography.bold : Typography.medium,
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                        {isSelected && (
                          <Check size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Seção 2: Origem, Conta e Banco */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <CreditCard size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  CONTA E MÉTODO DE PAGAMENTO
                </Text>
              </View>

              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Instituição / Banco</Text>
                  <View style={styles.detailValueContainer}>
                    <Building2 size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {card?.bankName || 'Banco Conectado'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Cartão / Conta</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    •••• {card?.lastFourDigits || '0001'}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Titular</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {card?.cardholderName || 'TITULAR DO CARTÃO'}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Modalidade</Text>
                  <Text style={[styles.detailValue, { color: electricBlue }]}>
                    {paymentModality.label}
                  </Text>
                </View>

                {installment && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Parcelamento</Text>
                      <View
                        style={[
                          styles.installmentPill,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <Layers size={13} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.installmentPillText, { color: colors.text }]}>
                          Parcela {installment.current} de {installment.total}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Seção 3: Data e Horário (Horário de Brasília) */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  DATA E HORÁRIO (OFICIAL DE BRASÍLIA)
                </Text>
              </View>

              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Data da Operação</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{fullDateStr}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Horário Exato</Text>
                  <View style={styles.detailValueContainer}>
                    <Clock size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {timeStr} • {timePeriod} (UTC-3)
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Status da Liquidação</Text>
                  <View style={styles.detailValueContainer}>
                    <ShieldCheck size={14} color={mintGreen} style={{ marginRight: 6 }} />
                    <Text style={[styles.detailValue, { color: mintGreen }]}>
                      Transação Confirmada
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Seção 4: Identificadores Técnicos Open Finance */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <FileText size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  DADOS DE AUDITORIA OPEN FINANCE
                </Text>
              </View>

              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>ID da Transação</Text>
                  <Pressable
                    onPress={handleCopyId}
                    style={styles.copyInlineContainer}
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.technicalIdText, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {transaction.id}
                    </Text>
                    {copiedId ? (
                      <Check size={13} color={colors.success} style={{ marginLeft: 6 }} />
                    ) : (
                      <Copy size={13} color={colors.textMuted} style={{ marginLeft: 6 }} />
                    )}
                  </Pressable>
                </View>

                {transaction.rawText && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                    <View style={styles.detailColumn}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted, marginBottom: 4 }]}>
                        Descrição Bruta Bancária
                      </Text>
                      <Text style={[styles.rawCodeText, { color: colors.textSecondary }]}>
                        {transaction.rawText}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  backdropArea: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    height: '92%',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: Radii.full,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
  },
  copyButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: Typography.medium,
    marginLeft: 8,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginBottom: 20,
  },
  heroIconSquircle: {
    width: 68,
    height: 68,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  merchantTitle: {
    fontSize: 20,
    fontFamily: Typography.bold,
    textAlign: 'center',
    letterSpacing: LetterSpacing.tight,
    marginBottom: 4,
  },
  rawMerchantText: {
    fontSize: 12,
    fontFamily: Typography.regular,
    textAlign: 'center',
    marginBottom: 14,
  },
  amountContainer: {
    marginVertical: 10,
  },
  amountValue: {
    fontSize: 34,
    fontFamily: Typography.bold,
    letterSpacing: LetterSpacing.tighter,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: LetterSpacing.wide,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: LetterSpacing.wider,
  },
  categoryGridCard: {
    padding: 14,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryChipLabel: {
    fontSize: 12,
    flex: 1,
  },
  detailsCard: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailColumn: {
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: Typography.regular,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
  installmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  installmentPillText: {
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  copyInlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
  },
  technicalIdText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rawCodeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  bottomSpacer: {
    height: 30,
  },
});
