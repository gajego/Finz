import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
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
  QrCode,
  Keyboard,
  Sparkles,
  Camera,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';
import { webSyncHost, HostConnectionState } from '@/services/webrtc/webSyncHost';
import { loadWebSyncSession } from '@/services/database/db';

interface WebSyncModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WebSyncModal: React.FC<WebSyncModalProps> = ({ visible, onClose }) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  const [syncMode, setSyncMode] = useState<'code' | 'qr'>('code');
  const [code, setCode] = useState('');
  const [serverUrl, setServerUrl] = useState('ws://192.168.15.15:8080');
  const [connectionState, setConnectionState] = useState<HostConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;
    if (connectionState === 'connecting') {
      pulseAnim.setValue(0);
      loopAnim = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      loopAnim.start();
    } else if (connectionState === 'connected') {
      pulseAnim.setValue(0);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      pulseAnim.setValue(0);
      successScale.setValue(0.7);
    }

    return () => {
      if (loopAnim) loopAnim.stop();
    };
  }, [connectionState]);

  useEffect(() => {
    const unsub = webSyncHost.addListener((state, err) => {
      setConnectionState(state);
      setErrorMessage(err || null);
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      const saved = loadWebSyncSession();
      if (saved) {
        if (saved.roomId && !code) setCode(saved.roomId);
        if (saved.serverUrl) {
          const cleanUrl = saved.serverUrl.includes('192.168.15.12')
            ? saved.serverUrl.replace('192.168.15.12', '192.168.15.15')
            : saved.serverUrl;
          setServerUrl(cleanUrl);
        }
      }
    }
  }, [visible]);

  const handleConnect = (overrideCode?: string) => {
    const targetCode = (overrideCode || code).trim().toUpperCase();
    if (!targetCode || targetCode.length < 4) {
      Alert.alert('Código Inválido', 'Insira o código de sessão de 6 dígitos exibido na tela do computador.');
      return;
    }
    webSyncHost.connect(serverUrl.trim(), targetCode);
  };

  const handleDisconnect = () => {
    webSyncHost.disconnect(true);
  };

  const handleForceSync = () => {
    webSyncHost.sendFullState();
    Alert.alert('Sincronizado', 'Snapshot completo enviado ao Finz!');
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
                <Text style={[styles.title, { color: colors.text }]}>Finz Sync</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Conectar ao Finz no Computador
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  connectionState === 'connected'
                    ? isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)'
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
            {connectionState === 'connecting' && (
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 10,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: colors.warning,
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2.2],
                      }),
                    },
                  ],
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.8, 0.3, 0],
                  }),
                }}
              />
            )}

            {connectionState === 'connected' ? (
              <Animated.View style={{ transform: [{ scale: successScale }] }}>
                <CheckCircle2 size={18} color={colors.success} />
              </Animated.View>
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
                  fontWeight: connectionState === 'connected' ? '700' : '500',
                },
              ]}
            >
              {connectionState === 'connected'
                ? 'Conectado ao Finz'
                : connectionState === 'connecting'
                ? 'Sincronizando com o Finz...'
                : 'Aguardando Pareamento'}
            </Text>
          </View>

          {errorMessage && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          )}

          {connectionState === 'connected' ? (
            <View style={styles.connectedCard}>
              <View style={styles.securityNotice}>
                <ShieldCheck size={18} color={colors.primary} />
                <Text style={[styles.securityText, { color: colors.textSecondary }]}>
                  Sincronização em tempo real ativa. Suas movimentações e saldos do celular estão espelhados com a tela do computador.
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <Pressable
                  style={[styles.syncButton, { backgroundColor: colors.primary }]}
                  onPress={handleForceSync}
                >
                  <RefreshCw size={18} color={colors.primaryForeground} />
                  <Text style={[styles.syncButtonText, { color: colors.primaryForeground }]}>
                    Re-enviar Dados
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
            <View style={styles.pairingContainer}>
              {/* Abas Alternadoras: Digitar Código ou QR Code */}
              <View
                style={[
                  styles.tabBar,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setSyncMode('code')}
                  style={[
                    styles.tabButton,
                    syncMode === 'code' && [
                      styles.tabButtonActive,
                      {
                        backgroundColor: isDark ? 'rgba(217, 249, 32, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                        borderColor: colors.primary,
                      },
                    ],
                  ]}
                >
                  <Keyboard
                    size={16}
                    color={syncMode === 'code' ? colors.primary : colors.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: syncMode === 'code' ? colors.text : colors.textMuted },
                    ]}
                  >
                    Digitar Código
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSyncMode('qr')}
                  style={[
                    styles.tabButton,
                    syncMode === 'qr' && [
                      styles.tabButtonActive,
                      {
                        backgroundColor: isDark ? 'rgba(217, 249, 32, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                        borderColor: colors.primary,
                      },
                    ],
                  ]}
                >
                  <QrCode
                    size={16}
                    color={syncMode === 'qr' ? colors.primary : colors.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: syncMode === 'qr' ? colors.text : colors.textMuted },
                    ]}
                  >
                    Ler QR Code
                  </Text>
                </Pressable>
              </View>

              {syncMode === 'code' ? (
                <View style={styles.formContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    CÓDIGO DE PAREAMENTO (6 DÍGITOS DO FINZ)
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
                    autoCorrect={false}
                    maxLength={8}
                  />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      SERVIDOR DE SINALIZAÇÃO
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.serverInput,
                      {
                        backgroundColor: colors.surfaceElevated,
                        color: colors.text,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    placeholder="ws://192.168.15.15:8080"
                    placeholderTextColor={colors.textMuted}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    autoCapitalize="none"
                  />

                  <Pressable
                    style={[
                      styles.connectButton,
                      {
                        backgroundColor: connectionState === 'connecting' ? colors.surfaceSubtle : colors.primary,
                        borderWidth: connectionState === 'connecting' ? 1 : 0,
                        borderColor: connectionState === 'connecting' ? colors.borderStrong : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      if (connectionState === 'connecting') {
                        handleDisconnect();
                      } else {
                        handleConnect();
                      }
                    }}
                  >
                    {connectionState === 'connecting' ? (
                      <>
                        <ActivityIndicator size="small" color={colors.danger} />
                        <Text style={[styles.connectButtonText, { color: colors.danger }]}>
                          Cancelar Tentativa
                        </Text>
                      </>
                    ) : (
                      <>
                        <Wifi size={18} color={colors.primaryForeground} />
                        <Text style={[styles.connectButtonText, { color: colors.primaryForeground }]}>
                          Conectar ao Computador
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.qrSectionWrapper}>
                  <View
                    style={[
                      styles.qrCard,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={[styles.qrIconBubble, { backgroundColor: `${colors.primary}18` }]}>
                      <Camera size={32} color={colors.primary} strokeWidth={2} />
                    </View>

                    <Text style={[styles.qrTitle, { color: colors.text }]}>
                      Como Escanear o QR Code
                    </Text>

                    <Text style={[styles.qrDesc, { color: colors.textSecondary }]}>
                      Abra o aplicativo de <Text style={{ color: colors.text, fontWeight: '700' }}>Câmera do seu iPhone ou Android</Text> e aponte para o QR Code na tela web.
                    </Text>

                    <View
                      style={[
                        styles.quickStepBox,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                      ]}
                    >
                      <Sparkles size={16} color={colors.primary} />
                      <Text style={[styles.quickStepText, { color: colors.text }]}>
                        O sistema reconhecerá o link e exibirá o banner <Text style={{ fontWeight: '700' }}>"Abrir no Finz"</Text> para conectar automaticamente!
                      </Text>
                    </View>

                    <View style={styles.orDividerRow}>
                      <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                      <Text style={[styles.orText, { color: colors.textMuted }]}>OU</Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                    </View>

                    <Pressable
                      style={[styles.switchTabBtn, { backgroundColor: colors.primary }]}
                      onPress={() => setSyncMode('code')}
                    >
                      <Keyboard size={16} color={colors.primaryForeground} />
                      <Text style={[styles.switchTabBtnText, { color: colors.primaryForeground }]}>
                        Digitar o Código de 6 Dígitos
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
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
  pairingContainer: {
    gap: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 4,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
  qrSectionWrapper: {
    width: '100%',
  },
  qrCard: {
    padding: 20,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  qrIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  qrTitle: {
    fontSize: 16,
    fontFamily: Typography.bold,
  },
  qrDesc: {
    fontSize: 13,
    fontFamily: Typography.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickStepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radii.md,
    marginVertical: 4,
  },
  quickStepText: {
    fontSize: 12,
    fontFamily: Typography.medium,
    flex: 1,
    lineHeight: 16,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
    fontFamily: Typography.bold,
  },
  switchTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  switchTabBtnText: {
    fontSize: 13,
    fontFamily: Typography.bold,
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
