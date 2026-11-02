import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Radio,
  Monitor,
  CheckCircle2,
  RefreshCw,
  PowerOff,
  Wifi,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import { webSyncHost, HostConnectionState } from '@/services/webrtc/webSyncHost';

interface WebSyncModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WebSyncModal: React.FC<WebSyncModalProps> = ({ visible, onClose }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const [code, setCode] = useState('');
  const [serverUrl, setServerUrl] = useState('ws://10.0.2.2:8080');
  const [connectionState, setConnectionState] = useState<HostConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = webSyncHost.addListener((state, err) => {
      setConnectionState(state);
      setErrorMessage(err || null);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleConnect = () => {
    if (!code || code.trim().length < 4) {
      Alert.alert('Código Inválido', 'Insira o código de sessão exibido na tela do Finz Web.');
      return;
    }
    webSyncHost.connect(serverUrl, code.trim());
  };

  const handleDisconnect = () => {
    webSyncHost.disconnect();
  };

  const handleForceSync = () => {
    webSyncHost.sendFullState();
    Alert.alert('Sincronizado', 'Snapshot completo enviado ao Finz Web!');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? 'rgba(217, 249, 32, 0.12)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Monitor size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Finz Web Sync</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Espelhamento P2P WebRTC Seguro
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  connectionState === 'connected'
                    ? isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
                    : connectionState === 'connecting'
                    ? isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'
                    : isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor:
                  connectionState === 'connected'
                    ? colors.success
                    : connectionState === 'connecting'
                    ? colors.warning
                    : colors.borderSubtle,
              },
            ]}
          >
            {connectionState === 'connected' ? (
              <CheckCircle2 size={16} color={colors.success} />
            ) : connectionState === 'connecting' ? (
              <ActivityIndicator size="small" color={colors.warning} />
            ) : (
              <Radio size={16} color={colors.textMuted} />
            )}
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    connectionState === 'connected'
                      ? colors.success
                      : connectionState === 'connecting'
                      ? colors.warning
                      : colors.textMuted,
                },
              ]}
            >
              {connectionState === 'connected'
                ? 'Conectado ao Finz Web (Túnel Ativo)'
                : connectionState === 'connecting'
                ? 'Estabelecendo Túnel WebRTC...'
                : 'Aguardando Pareamento'}
            </Text>
          </View>

          {errorMessage && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          )}

          {/* Conteúdo Conectado vs Formulário */}
          {connectionState === 'connected' ? (
            <View style={styles.connectedCard}>
              <View style={styles.securityNotice}>
                <ShieldCheck size={18} color={colors.primary} />
                <Text style={[styles.securityText, { color: colors.textSecondary }]}>
                  Sincronização em tempo real ativa. Qualquer transação ou alteração de saldo no celular é espelhada instantaneamente para a versão Web em memória.
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <Pressable
                  style={[styles.syncButton, { backgroundColor: colors.primary }]}
                  onPress={handleForceSync}
                >
                  <RefreshCw size={18} color={colors.primaryForeground} />
                  <Text style={[styles.syncButtonText, { color: colors.primaryForeground }]}>
                    Re-enviar Estado Completo
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.disconnectButton, { borderColor: colors.borderStrong }]}
                  onPress={handleDisconnect}
                >
                  <PowerOff size={16} color={colors.danger} />
                  <Text style={[styles.disconnectButtonText, { color: colors.danger }]}>
                    Desconectar Sessão
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                CÓDIGO DE PAREAMENTO (6 DÍGITOS DO FINZ WEB)
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    color: colors.text,
                    borderColor: colors.borderStrong,
                  },
                ]}
                placeholder="Ex: WX82K9"
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={8}
              />

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                SERVIDOR DE SINALIZAÇÃO WEBSOCKET
              </Text>
              <TextInput
                style={[
                  styles.serverInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    color: colors.text,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                placeholder="ws://10.0.2.2:8080 ou ws://IP:8080"
                placeholderTextColor={colors.textMuted}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
              />

              <Pressable
                style={[
                  styles.connectButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: connectionState === 'connecting' ? 0.7 : 1,
                  },
                ]}
                onPress={handleConnect}
                disabled={connectionState === 'connecting'}
              >
                {connectionState === 'connecting' ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Wifi size={18} color={colors.primaryForeground} />
                )}
                <Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>
                  {connectionState === 'connecting' ? 'Conectando...' : 'Iniciar Pareamento Web'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.xl,
    padding: 20,
    borderWidth: 1,
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
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.bold,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.regular,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.medium,
    marginBottom: 12,
  },
  formContainer: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  codeInput: {
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 20,
    fontFamily: Typography.bold,
    letterSpacing: 4,
    textAlign: 'center',
  },
  serverInput: {
    height: 40,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: Typography.regular,
  },
  connectButton: {
    height: 46,
    borderRadius: Radii.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  connectButtonText: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  connectedCard: {
    gap: 16,
  },
  securityNotice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  securityText: {
    fontSize: 12,
    fontFamily: Typography.regular,
    lineHeight: 18,
    flex: 1,
  },
  actionButtons: {
    gap: 10,
  },
  syncButton: {
    height: 46,
    borderRadius: Radii.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  syncButtonText: {
    fontSize: 14,
    fontFamily: Typography.bold,
  },
  disconnectButton: {
    height: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disconnectButtonText: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
});
