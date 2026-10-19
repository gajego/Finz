import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import {
  X,
  Landmark,
  ShieldCheck,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Trash2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography, LetterSpacing } from '@/theme/typography';
import {
  getPluggyCredentials,
  savePluggyCredentials,
  clearPluggyCredentials,
  openPluggyConnectWidget,
  syncAllPluggyItems,
  getPluggyItemIds,
} from '@/services/pluggy/pluggyService';
import { PulseLoader } from '@/components/ui/PulseLoader';

interface PluggyConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PluggyConnectModal: React.FC<PluggyConnectModalProps> = ({ visible, onClose }) => {
  const { colors, mode } = useTheme();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [hasSavedCreds, setHasSavedCreds] = useState(false);
  const [connectedItemsCount, setConnectedItemsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadState();
    }
  }, [visible]);

  const loadState = () => {
    const creds = getPluggyCredentials();
    const items = getPluggyItemIds();
    setConnectedItemsCount(items.length);

    if (creds) {
      setClientId(creds.clientId);
      setClientSecret(creds.clientSecret);
      setHasSavedCreds(true);
      setIsEditing(false);
    } else {
      setHasSavedCreds(false);
      setIsEditing(true);
    }
  };

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, informe tanto o Client ID quanto o Client Secret.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Autenticando com a API Pluggy...');

    try {
      // 1. Salva credenciais
      savePluggyCredentials(clientId, clientSecret);
      setHasSavedCreds(true);

      // 2. Gera connect token e abre o Connect Widget
      setLoadingMessage('Gerando Connect Token e abrindo widget...');
      await openPluggyConnectWidget(mode === 'dark' ? 'dark' : 'light');

      setLoading(false);
      onClose();

      Alert.alert(
        'Widget Pluggy Aberto',
        'Selecione sua instituição bancária no navegador. Ao concluir a conexão, retorne ao Finz e toque em "Sincronizar Agora" para importar seus cartões e saldos.'
      );
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Falha na Conexão', err?.message || 'Verifique se seu Client ID e Client Secret estão corretos no dashboard da Pluggy.');
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    setLoadingMessage('Sincronizando contas e faturas...');

    try {
      const res = await syncAllPluggyItems();
      setLoading(false);
      Alert.alert(
        'Sincronização Concluída',
        `Sucesso! ${res.cardsTotal} cartão(ões) e ${res.txTotal} transação(ões) atualizados.`
      );
      loadState();
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Erro na Sincronização', err?.message || 'Não foi possível sincronizar os dados bancários.');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Desconectar Pluggy',
      'Deseja remover as credenciais salvas do seu app?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () => {
            clearPluggyCredentials();
            setClientId('');
            setClientSecret('');
            setHasSavedCreds(false);
            setIsEditing(true);
          },
        },
      ]
    );
  };

  const handleOpenDashboard = () => {
    Linking.openURL('https://dashboard.pluggy.ai');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View
            style={[
              styles.sheet,
              {
                backgroundColor: mode === 'dark' ? colors.surface : colors.background,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            {/* Header com Ícone Squircle */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <Landmark size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.headerOverline, { color: colors.textMuted }]}>
                    OPEN FINANCE • PLUGGY
                  </Text>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Conectar Minha Conta
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                hitSlop={8}
              >
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <View style={styles.loadingWrap}>
                  <PulseLoader size="medium" message={loadingMessage} />
                </View>
              ) : hasSavedCreds && !isEditing ? (
                /* Estado Conectado: Ações Rápidas */
                <View style={styles.connectedCard}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: colors.successSubtle,
                        borderColor: colors.success,
                      },
                    ]}
                  >
                    <CheckCircle2 size={14} color={colors.success} />
                    <Text style={[styles.statusPillText, { color: colors.success }]}>
                      AUTENTICADO COM PLUGGY
                    </Text>
                  </View>

                  <Text style={[styles.connectedDesc, { color: colors.textSecondary }]}>
                    Seu Client ID está configurado. Você pode abrir o widget oficial para conectar um novo banco ou sincronizar os cartões e faturas existentes.
                  </Text>

                  {connectedItemsCount > 0 && (
                    <View style={[styles.infoBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
                      <ShieldCheck size={16} color={colors.primary} />
                      <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                        {connectedItemsCount} instituição(ões) financeira(s) vinculada(s)
                      </Text>
                    </View>
                  )}

                  {/* Botão Primário: Conectar Novo Banco no Widget */}
                  <Pressable
                    onPress={handleConnect}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Landmark size={18} color={mode === 'dark' ? '#000000' : '#FFFFFF'} />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: mode === 'dark' ? '#000000' : '#FFFFFF' },
                      ]}
                    >
                      CONECTAR BANCO NO WIDGET
                    </Text>
                    <ArrowRight size={16} color={mode === 'dark' ? '#000000' : '#FFFFFF'} />
                  </Pressable>

                  {/* Botão Secundário: Sincronizar Faturas e Saldos */}
                  <Pressable
                    onPress={handleSyncNow}
                    style={({ pressed }) => [
                      styles.actionBtnSecondary,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderStrong,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <RefreshCw size={16} color={colors.text} />
                    <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                      SINCRONIZAR AGORA
                    </Text>
                  </Pressable>

                  {/* Links de Gerenciamento */}
                  <View style={styles.footerLinksRow}>
                    <Pressable onPress={() => setIsEditing(true)}>
                      <Text style={[styles.editLink, { color: colors.primary }]}>
                        Editar Credenciais
                      </Text>
                    </Pressable>

                    <Pressable onPress={handleClear} style={styles.deleteLinkRow}>
                      <Trash2 size={13} color={colors.danger} />
                      <Text style={[styles.deleteLink, { color: colors.danger }]}>
                        Desconectar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Formulário de Credenciais */
                <View>
                  <Text style={[styles.formDesc, { color: colors.textSecondary }]}>
                    Para sincronizar seus dados reais pelo Open Finance, insira suas credenciais da API da Pluggy (disponíveis gratuitamente para desenvolvimento).
                  </Text>

                  {/* Campo Client ID */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>
                      CLIENT ID
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.borderStrong,
                          color: colors.text,
                        },
                      ]}
                      value={clientId}
                      onChangeText={setClientId}
                      placeholder="Cole seu Client ID da Pluggy"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Campo Client Secret */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>
                      CLIENT SECRET
                    </Text>
                    <View style={styles.secretInputRow}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.secretInput,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.borderStrong,
                            color: colors.text,
                          },
                        ]}
                        value={clientSecret}
                        onChangeText={setClientSecret}
                        placeholder="Cole seu Client Secret"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showSecret}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Pressable
                        onPress={() => setShowSecret(!showSecret)}
                        style={styles.eyeBtn}
                        hitSlop={8}
                      >
                        {showSecret ? (
                          <EyeOff size={18} color={colors.textSecondary} />
                        ) : (
                          <Eye size={18} color={colors.textSecondary} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {/* Link explicativo do Dashboard */}
                  <Pressable
                    onPress={handleOpenDashboard}
                    style={[styles.dashboardLinkRow, { backgroundColor: colors.surfaceSubtle }]}
                  >
                    <ExternalLink size={14} color={colors.primary} />
                    <Text style={[styles.dashboardLinkText, { color: colors.primary }]}>
                      Abrir dashboard.pluggy.ai para copiar credenciais
                    </Text>
                  </Pressable>

                  {/* Botão de Salvar e Conectar */}
                  <Pressable
                    onPress={handleConnect}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.85 : 1,
                        marginTop: 18,
                      },
                    ]}
                  >
                    <Landmark size={18} color={mode === 'dark' ? '#000000' : '#FFFFFF'} />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: mode === 'dark' ? '#000000' : '#FFFFFF' },
                      ]}
                    >
                      CONECTAR MINHA CONTA
                    </Text>
                    <ArrowRight size={16} color={mode === 'dark' ? '#000000' : '#FFFFFF'} />
                  </Pressable>

                  {hasSavedCreds && (
                    <Pressable
                      onPress={() => setIsEditing(false)}
                      style={styles.cancelEditBtn}
                    >
                      <Text style={[styles.cancelEditText, { color: colors.textMuted }]}>
                        Cancelar Edição
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 26,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverline: {
    fontFamily: Typography.bold,
    fontSize: 9.5,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 2,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedCard: {
    gap: 14,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wide,
  },
  connectedDesc: {
    fontFamily: Typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoBannerText: {
    fontFamily: Typography.medium,
    fontSize: 12,
  },
  actionBtn: {
    height: 52,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  actionBtnText: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: LetterSpacing.wide,
  },
  actionBtnSecondary: {
    height: 48,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnSecondaryText: {
    fontFamily: Typography.bold,
    fontSize: 11.5,
    letterSpacing: LetterSpacing.wide,
  },
  footerLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  editLink: {
    fontFamily: Typography.bold,
    fontSize: 12,
  },
  deleteLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteLink: {
    fontFamily: Typography.bold,
    fontSize: 12,
  },
  formDesc: {
    fontFamily: Typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: Typography.medium,
    fontSize: 14,
  },
  secretInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  secretInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    height: 50,
    justifyContent: 'center',
  },
  dashboardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  dashboardLinkText: {
    fontFamily: Typography.medium,
    fontSize: 11.5,
  },
  cancelEditBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  cancelEditText: {
    fontFamily: Typography.medium,
    fontSize: 12,
  },
});
