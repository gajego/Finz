import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  useSwipeModalDismiss,
  ModalTopHandle,
  ModalBottomHandle,
} from '@/components/ui/SwipeableModalSheet';
import {
  X,
  User,
  Moon,
  Sun,
  Bell,
  BellRing,
  BellOff,
  AlertTriangle,
  CreditCard,
  Landmark,
  Download,
  Info,
  Trash2,
  Check,
  ShieldAlert,
  Calendar,
  Mail,
  Phone,
  FileText,
  Sparkles,
} from 'lucide-react-native';
import { useWalletStore } from '@/store/useWalletStore';
import { useTheme } from '@/theme/useTheme';
import { Typography, LetterSpacing } from '@/theme/typography';
import { NotificationPreference } from '@/types';
import { fetchPluggyIdentity } from '@/services/pluggy/pluggyService';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';

  const profile = useWalletStore((s) => s.profile);
  const setProfile = useWalletStore((s) => s.setProfile);
  const cards = useWalletStore((s) => s.cards);
  const notificationPreference = useWalletStore((s) => s.notificationPreference);
  const setNotificationPreference = useWalletStore((s) => s.setNotificationPreference);
  const clearAllLocalData = useWalletStore((s) => s.clearAllLocalData);

  // Formulário de dados básicos
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [document, setDocument] = useState(profile.document || '');
  const [birthDate, setBirthDate] = useState(profile.birthDate || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');

  const [isImporting, setIsImporting] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Sincroniza estado com o store ao abrir
  useEffect(() => {
    if (visible) {
      setFullName(profile.fullName || '');
      setNickname(profile.nickname || '');
      setDocument(profile.document || '');
      setBirthDate(profile.birthDate || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setSaveSuccessNotice(null);
    }
  }, [visible, profile]);

  const initials = useMemo(() => {
    const name = fullName.trim() || profile.fullName?.trim() || 'Wesley Souza';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'FZ';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [fullName, profile.fullName]);

  // Salvar edições manuais
  const handleSaveProfile = () => {
    setProfile({
      fullName: fullName.trim(),
      nickname: nickname.trim(),
      document: document.trim(),
      birthDate: birthDate.trim(),
      email: email.trim(),
      phone: phone.trim(),
      onboardingCompleted: true,
    });
    setSaveSuccessNotice('Informações pessoais salvas com sucesso!');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  // Importar exclusivamente dados pessoais do Pluggy (Open Finance)
  const handleImportFromPluggy = async () => {
    setIsImporting(true);
    try {
      const identity = await fetchPluggyIdentity();
      if (!identity) {
        Alert.alert('Open Finance', 'Nenhum dado cadastral encontrado para a conta conectada.');
        return;
      }

      const updated = {
        fullName: identity.fullName || fullName,
        document: identity.document || document,
        birthDate: identity.birthDate || birthDate,
        email: identity.email || email,
        phone: identity.phone || phone,
      };

      setFullName(updated.fullName);
      if (updated.document) setDocument(updated.document);
      if (updated.birthDate) setBirthDate(updated.birthDate);
      if (updated.email) setEmail(updated.email);
      if (updated.phone) setPhone(updated.phone);

      setProfile(updated);
      setSaveSuccessNotice('Dados pessoais importados com sucesso do Open Finance!');
      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (e: any) {
      Alert.alert(
        'Falha na Importação',
        e?.message || 'Não foi possível carregar os dados cadastrais do Open Finance.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Limpar dados locais com confirmação dupla
  const handleClearAllData = () => {
    Alert.alert(
      'Limpar Tudo Local',
      'Tem certeza que deseja apagar todos os dados locais? Seu histórico de transações, cartões e preferências locais serão resetados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Limpar Tudo',
          style: 'destructive',
          onPress: () => {
            clearAllLocalData();
            onClose();
          },
        },
      ]
    );
  };

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdropArea} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.background,
              borderColor: colors.borderStrong,
            },
            animatedSheetStyle,
          ]}
        >
          {/* Barra de Arraste Superior com Gesto de Arrastar para Fechar */}
          <ModalTopHandle
            panHandlers={handlePanResponder.panHandlers}
            color={colors.border}
          />

          {/* Header do Menu de Perfil com Gesto de Arraste */}
          <View {...headerPanResponder.panHandlers} style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={[styles.title, { color: colors.text }]}>MENU DE PERFIL</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Informações pessoais, preferências e ajustes
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                },
              ]}
              hitSlop={8}
            >
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Toast / Alerta de Sucesso */}
          {saveSuccessNotice && (
            <View
              style={[
                styles.successNotice,
                {
                  backgroundColor: `${colors.primary}18`,
                  borderColor: `${colors.primary}44`,
                },
              ]}
            >
              <Check size={14} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.successNoticeText, { color: colors.primary }]}>
                {saveSuccessNotice}
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Card do Usuário */}
            <View
              style={[
                styles.userHeroCard,
                {
                  backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.avatarSquircle,
                  {
                    backgroundColor: `${colors.primary}15`,
                    borderColor: `${colors.primary}35`,
                  },
                ]}
              >
                <Text style={[styles.avatarHeroText, { color: colors.primary }]}>{initials}</Text>
              </View>

              <View style={styles.userHeroInfo}>
                <Text style={[styles.userHeroName, { color: colors.text }]} numberOfLines={1}>
                  {fullName.trim() || 'Usuário Finz'}
                </Text>
                <Text style={[styles.userHeroSub, { color: colors.textSecondary }]}>
                  {email.trim() || 'Conta Finz Autônoma'}
                </Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: cards.length > 0 ? 'rgba(0, 208, 158, 0.12)' : colors.surfaceSubtle,
                        borderColor: cards.length > 0 ? 'rgba(0, 208, 158, 0.3)' : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: cards.length > 0 ? '#00D09E' : colors.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: cards.length > 0 ? '#00D09E' : colors.textMuted },
                      ]}
                    >
                      {cards.length > 0 ? 'OPEN FINANCE ATIVO' : 'CONTA LOCAL'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* SEÇÃO 1: Dados Pessoais & Importar do Pluggy */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <User size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  DADOS PESSOAIS
                </Text>
              </View>

              {/* Botão de Importar do Pluggy */}
              <Pressable
                onPress={handleImportFromPluggy}
                disabled={isImporting}
                style={({ pressed }) => [
                  styles.importButton,
                  {
                    backgroundColor: mode === 'dark' ? 'rgba(217, 249, 32, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: mode === 'dark' ? 'rgba(217, 249, 32, 0.3)' : 'rgba(0, 0, 0, 0.15)',
                    opacity: pressed || isImporting ? 0.75 : 1,
                  },
                ]}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                ) : (
                  <Landmark size={15} color={colors.primary} style={{ marginRight: 8 }} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.importButtonTitle, { color: colors.text }]}>
                    {isImporting ? 'Importando do Open Finance...' : 'Importar dados pessoais do Pluggy'}
                  </Text>
                  <Text style={[styles.importButtonSub, { color: colors.textMuted }]}>
                    Preenche nome, CPF e nascimento via Open Finance
                  </Text>
                </View>
                <Download size={14} color={colors.primary} />
              </Pressable>

              {/* Campos de Entrada */}
              <View style={styles.inputsGrid}>
                {/* Nome Completo */}
                <View style={styles.inputField}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>NOME COMPLETO</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Seu nome completo"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Apelido */}
                <View style={styles.inputField}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>APELIDO / TRATAMENTO</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={nickname}
                    onChangeText={setNickname}
                    placeholder="Como quer ser chamado"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* CPF / Documento */}
                <View style={styles.inputField}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CPF / DOCUMENTO</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={document}
                    onChangeText={setDocument}
                    placeholder="000.000.000-00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                {/* Data de Nascimento */}
                <View style={styles.inputField}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DATA DE NASCIMENTO</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={birthDate}
                    onChangeText={setBirthDate}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* E-mail */}
                <View style={styles.inputField}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>E-MAIL</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seuemail@exemplo.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Telefone */}
                <View style={styles.inputField}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>TELEFONE</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Botão Salvar Dados */}
              <Pressable
                onPress={handleSaveProfile}
                style={({ pressed }) => [
                  styles.saveProfileButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Check size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                <Text style={[styles.saveProfileButtonText, { color: colors.primaryForeground }]}>
                  SALVAR ALTERAÇÕES
                </Text>
              </Pressable>
            </View>

            {/* SEÇÃO 2: Tema (Claro / Escuro) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Sun size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  TEMA VISUAL
                </Text>
              </View>

              <View style={styles.themeOptionsRow}>
                {/* Opção Escuro */}
                <Pressable
                  onPress={() => mode !== 'dark' && toggleTheme()}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
                      borderColor: mode === 'dark' ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.themeIconCircle,
                      {
                        backgroundColor: mode === 'dark' ? `${colors.primary}20` : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Moon size={16} color={mode === 'dark' ? colors.primary : colors.textMuted} />
                  </View>
                  <Text
                    style={[
                      styles.themeCardTitle,
                      { color: mode === 'dark' ? colors.text : colors.textSecondary },
                    ]}
                  >
                    Escuro (OLED)
                  </Text>
                  {mode === 'dark' && (
                    <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.activePillText, { color: colors.primaryForeground }]}>
                        ATIVO
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Opção Claro */}
                <Pressable
                  onPress={() => mode !== 'light' && toggleTheme()}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: mode === 'light' ? colors.surface : colors.surfaceElevated,
                      borderColor: mode === 'light' ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.themeIconCircle,
                      {
                        backgroundColor: mode === 'light' ? `${colors.primary}20` : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Sun size={16} color={mode === 'light' ? colors.primary : colors.textMuted} />
                  </View>
                  <Text
                    style={[
                      styles.themeCardTitle,
                      { color: mode === 'light' ? colors.text : colors.textSecondary },
                    ]}
                  >
                    Claro
                  </Text>
                  {mode === 'light' && (
                    <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.activePillText, { color: colors.primaryForeground }]}>
                        ATIVO
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* SEÇÃO 3: Controle de Notificações */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Bell size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  CONTROLE DE NOTIFICAÇÕES
                </Text>
              </View>

              <View
                style={[
                  styles.notificationGroupCard,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                {[
                  {
                    key: 'all' as NotificationPreference,
                    title: 'Todas as notificações',
                    desc: 'Compras, transferências Pix, alertas de teto e saldo',
                    icon: BellRing,
                  },
                  {
                    key: 'alerts_only' as NotificationPreference,
                    title: 'Somente avisos e alertas',
                    desc: 'Metas excedidas, tetos próximos e limites',
                    icon: AlertTriangle,
                  },
                  {
                    key: 'transactions_only' as NotificationPreference,
                    title: 'Somente transações financeiras',
                    desc: 'Apenas novas movimentações de cartão e Pix',
                    icon: CreditCard,
                  },
                  {
                    key: 'none' as NotificationPreference,
                    title: 'Nenhuma notificação',
                    desc: 'Silencia todos os alertas e notificações',
                    icon: BellOff,
                  },
                ].map((item, idx) => {
                  const isSelected = notificationPreference === item.key;
                  const IconComp = item.icon;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setNotificationPreference(item.key)}
                      style={[
                        styles.notificationOptionRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                      ]}
                    >
                      <View
                        style={[
                          styles.notifIconCircle,
                          {
                            backgroundColor: isSelected ? `${colors.primary}18` : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                      >
                        <IconComp
                          size={15}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                      </View>

                      <View style={{ flex: 1, paddingHorizontal: 10 }}>
                        <Text
                          style={[
                            styles.notifOptionTitle,
                            {
                              color: isSelected ? colors.text : colors.textSecondary,
                              fontFamily: isSelected ? Typography.bold : Typography.medium,
                            },
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text style={[styles.notifOptionDesc, { color: colors.textMuted }]}>
                          {item.desc}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioOuter,
                          {
                            borderColor: isSelected ? colors.primary : colors.borderStrong,
                          },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[styles.radioInner, { backgroundColor: colors.primary }]}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* SEÇÃO 4: Informações do App */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Info size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  SOBRE O APLICATIVO
                </Text>
              </View>

              <View
                style={[
                  styles.aboutCard,
                  {
                    backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.aboutRow}>
                  <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Nome</Text>
                  <Text style={[styles.aboutValue, { color: colors.text }]}>Finz Core</Text>
                </View>
                <View style={[styles.aboutRow, styles.aboutDivider, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Versão / Release</Text>
                  <Text style={[styles.aboutValue, { color: colors.text }]}>v1.0.0 (Core 2026.10)</Text>
                </View>
                <View style={[styles.aboutRow, styles.aboutDivider, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Build</Text>
                  <Text style={[styles.aboutValue, { color: colors.text }]}>2026.10.22-rel</Text>
                </View>
                <View style={[styles.aboutRow, styles.aboutDivider, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Autor & Desenvolvimento</Text>
                  <Text style={[styles.aboutValue, { color: colors.text }]}>Wesley Souza & Finz Team</Text>
                </View>
                <View style={[styles.aboutRow, styles.aboutDivider, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Motor</Text>
                  <Text style={[styles.aboutValue, { color: colors.text }]}>React Native • Expo SDK 52 • SQLite</Text>
                </View>
                <View style={[styles.aboutRow, styles.aboutDivider, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Segurança</Text>
                  <Text style={[styles.aboutValue, { color: '#00D09E' }]}>Open Finance Criptografado</Text>
                </View>
              </View>
            </View>

            {/* SEÇÃO 5: Opções Avançadas (Zona de Risco) */}
            <View style={[styles.section, { marginBottom: 30 }]}>
              <View style={styles.sectionHeaderRow}>
                <ShieldAlert size={13} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                  OPÇÕES AVANÇADAS
                </Text>
              </View>

              <Pressable
                onPress={handleClearAllData}
                style={({ pressed }) => [
                  styles.clearDataButton,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Trash2 size={16} color={colors.danger} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clearDataButtonText, { color: colors.danger }]}>
                    Limpar todos os dados locais
                  </Text>
                  <Text style={[styles.clearDataSubText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                    Restaura transações e cartões locais para o estado inicial
                  </Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>

          {/* Barra Inferior com Gesto de Arrastar para Fechar */}
          <ModalBottomHandle
            panHandlers={handlePanResponder.panHandlers}
            color={colors.border}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdropArea: {
    flex: 1,
  },
  sheet: {
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 8,
  },
  topHandleBar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  successNoticeText: {
    flex: 1,
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
  },
  userHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
  },
  avatarSquircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHeroText: {
    fontFamily: Typography.bold,
    fontSize: 18,
    letterSpacing: LetterSpacing.tight,
  },
  userHeroInfo: {
    flex: 1,
  },
  userHeroName: {
    fontFamily: Typography.bold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  userHeroSub: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontFamily: Typography.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  importButtonTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  importButtonSub: {
    fontFamily: Typography.regular,
    fontSize: 10,
    marginTop: 2,
  },
  inputsGrid: {
    gap: 10,
  },
  inputField: {
    gap: 4,
  },
  inputLabel: {
    fontFamily: Typography.bold,
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: Typography.medium,
    fontSize: 13,
  },
  saveProfileButton: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  saveProfileButtonText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  themeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
  },
  activePillText: {
    fontFamily: Typography.bold,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  notificationGroupCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  notifIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifOptionTitle: {
    fontSize: 12,
  },
  notifOptionDesc: {
    fontFamily: Typography.regular,
    fontSize: 10,
    marginTop: 1,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  aboutCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  aboutDivider: {
    borderTopWidth: 1,
  },
  aboutLabel: {
    fontFamily: Typography.medium,
    fontSize: 11,
  },
  aboutValue: {
    fontFamily: Typography.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  clearDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearDataButtonText: {
    fontFamily: Typography.bold,
    fontSize: 13,
  },
  clearDataSubText: {
    fontFamily: Typography.regular,
    fontSize: 10,
    marginTop: 2,
  },
});
