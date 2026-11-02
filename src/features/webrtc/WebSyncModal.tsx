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
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  Camera,
  ScanLine,
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

  const [syncMode, setSyncMode] = useState<'qr' | 'code'>('qr');
  const [code, setCode] = useState('');
  const [serverUrl, setServerUrl] = useState('ws://192.168.15.12:8080');
  const [connectionState, setConnectionState] = useState<HostConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

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
      if (state === 'error' || state === 'idle') {
        setScanned(false);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      const saved = loadWebSyncSession();
      if (saved) {
        if (saved.roomId && !code) setCode(saved.roomId);
        if (saved.serverUrl) setServerUrl(saved.serverUrl);
      }
    }
  }, [visible]);

  const handleConnect = (overrideCode?: string, overrideUrl?: string) => {
    const targetCode = (overrideCode || code).trim();
    const targetUrl = (overrideUrl || serverUrl).trim();
    if (!targetCode || targetCode.length < 4) {
      Alert.alert('Código Inválido', 'Insira o código de sessão exibido na tela do Finz.');
      return;
    }
    webSyncHost.connect(targetUrl, targetCode);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || connectionState === 'connecting' || connectionState === 'connected') return;
    setScanned(true);

    let targetCode = data.trim();
    let targetUrl = serverUrl;

    try {
      const parsed = JSON.parse(data);
      if (parsed.sessionId) {
        targetCode = String(parsed.sessionId).trim();
      }
      if (parsed.serverUrl) {
        targetUrl = String(parsed.serverUrl).trim();
        setServerUrl(targetUrl);
      }
    } catch {
      // Valor puro do código sem encapsulamento JSON
    }

    setCode(targetCode);
    handleConnect(targetCode, targetUrl);
  };

  const handleDisconnect = () => {
    setScanned(false);
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
                  Conexão em Tempo Real
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
                  Sincronização em tempo real ativa. As movimentações e saldos do app são espelhados com o computador.
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
              {/* Abas Alternadoras: Ler QR Code ou Digitar Código */}
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
                  onPress={() => {
                    setSyncMode('qr');
                    setScanned(false);
                  }}
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
              </View>

              {syncMode === 'qr' ? (
                <View style={styles.qrSection}>
                  {!permission?.granted ? (
                    <View
                      style={[
                        styles.permissionBox,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Camera size={36} color={colors.primary} strokeWidth={1.8} />
                      <Text style={[styles.permissionTitle, { color: colors.text }]}>
                        Acesso à Câmera
                      </Text>
                      <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
                        Para conectar escaneando o QR Code na tela do seu computador, autorize o uso da câmera.
                      </Text>
                      <Pressable
                        style={[styles.grantButton, { backgroundColor: colors.primary }]}
                        onPress={requestPermission}
                      >
                        <ScanLine size={16} color={colors.primaryForeground} strokeWidth={2.2} />
                        <Text style={[styles.grantButtonText, { color: colors.primaryForeground }]}>
                          Permitir Câmera
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.cameraBoxWrapper}>
                      <View
                        style={[
                          styles.cameraContainer,
                          {
                            borderColor: colors.borderStrong,
                            backgroundColor: '#000',
                          },
                        ]}
                      >
                        <CameraView
                          style={StyleSheet.absoluteFill}
                          facing="back"
                          barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                          }}
                          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        />

                        {/* Viewfinder Target Stylings */}
                        <View style={styles.viewFinder}>
                          <View style={[styles.cornerMarker, styles.cornerTL, { borderColor: colors.primary }]} />
                          <View style={[styles.cornerMarker, styles.cornerTR, { borderColor: colors.primary }]} />
                          <View style={[styles.cornerMarker, styles.cornerBL, { borderColor: colors.primary }]} />
                          <View style={[styles.cornerMarker, styles.cornerBR, { borderColor: colors.primary }]} />
                        </View>
                      </View>

                      <Text style={[styles.cameraHint, { color: colors.textSecondary }]}>
                        {scanned
                          ? 'QR Code identificado! Conectando...'
                          : 'Aponte para o QR Code exibido na tela web'}
                      </Text>

                      {scanned && (
                        <Pressable
                          style={[styles.rescanBtn, { borderColor: colors.borderSubtle }]}
                          onPress={() => setScanned(false)}
                        >
                          <RefreshCw size={14} color={colors.textSecondary} />
                          <Text style={[styles.rescanBtnText, { color: colors.textSecondary }]}>
                            Escanear novamente
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    CÓDIGO DE PAREAMENTO (6 DÍGITOS)
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
                    placeholder="ws://192.168.15.12:8080"
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
                          Conectar via Código
                        </Text>
                      </>
                    )}
                  </Pressable>
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
  qrSection: {
    alignItems: 'center',
  },
  permissionBox: {
    width: '100%',
    padding: 24,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
  },
  permissionTitle: {
    fontSize: 16,
    fontFamily: Typography.bold,
  },
  permissionDesc: {
    fontSize: 13,
    fontFamily: Typography.regular,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  grantButtonText: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  cameraBoxWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  cameraContainer: {
    width: '100%',
    height: 240,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewFinder: {
    width: 170,
    height: 170,
    position: 'relative',
  },
  cornerMarker: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  cameraHint: {
    fontSize: 12,
    fontFamily: Typography.regular,
    textAlign: 'center',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  rescanBtnText: {
    fontSize: 12,
    fontFamily: Typography.medium,
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
