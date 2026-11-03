import React, { Component, ReactNode, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Camera, RefreshCw, Keyboard, AlertCircle, ScanLine, QrCode } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Typography, Radii } from '@/theme/typography';

function loadExpoCamera(): any | null {
  try {
    // Carregamento dinâmico seguro em runtime para não quebrar a inicialização do app no boot
    const mod = require('expo-camera');
    if (mod && (mod.CameraView || mod.useCameraPermissions)) {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CameraErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.warn('[QrScannerView] Falha ao inicializar CameraView:', error?.message);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

interface QrScannerViewProps {
  onScan: (data: string) => void;
  onSwitchToCode: () => void;
  scanned: boolean;
  onResetScan: () => void;
}

interface NativeScannerProps extends QrScannerViewProps {
  CameraModule: any;
}

const NativeScanner: React.FC<NativeScannerProps> = ({
  CameraModule,
  onScan,
  onSwitchToCode,
  scanned,
  onResetScan,
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = CameraModule.useCameraPermissions();
  const CameraView = CameraModule.CameraView;

  if (!permission) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permissionCard,
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
          Para ler o QR Code do Finz na tela do computador, conceda permissão de acesso à câmera.
        </Text>

        <View style={styles.permissionActionRow}>
          <Pressable
            style={[styles.grantBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <ScanLine size={16} color={colors.primaryForeground} />
            <Text style={[styles.grantBtnText, { color: colors.primaryForeground }]}>
              Autorizar Câmera
            </Text>
          </Pressable>

          <Pressable
            style={[styles.altBtn, { borderColor: colors.borderStrong }]}
            onPress={onSwitchToCode}
          >
            <Keyboard size={15} color={colors.textSecondary} />
            <Text style={[styles.altBtnText, { color: colors.textSecondary }]}>
              Digitar Código
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.cameraBox,
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
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }: { data: string }) => {
                  if (data) onScan(data);
                }
          }
        />

        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
        </View>
      </View>

      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        {scanned ? 'QR Code lido com sucesso! Conectando...' : 'Aponte para o QR Code na tela web'}
      </Text>

      {scanned && (
        <Pressable
          style={[styles.rescanBtn, { borderColor: colors.borderSubtle }]}
          onPress={onResetScan}
        >
          <RefreshCw size={13} color={colors.textSecondary} />
          <Text style={[styles.rescanText, { color: colors.textSecondary }]}>
            Escanear novamente
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export const QrScannerView: React.FC<QrScannerViewProps> = (props) => {
  const { colors } = useTheme();
  const [cameraModule] = useState<any | null>(() => loadExpoCamera());

  if (!cameraModule) {
    return (
      <View
        style={[
          styles.permissionCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <QrCode size={36} color={colors.primary} />
        <Text style={[styles.permissionTitle, { color: colors.text }]}>
          Câmera Requer Novo Build Nativo
        </Text>
        <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
          O módulo nativo de câmera precisa ser compilado no binário do aplicativo para abrir a lente.
          Conecte instantaneamente digitando o código de 6 dígitos exibido na tela web!
        </Text>
        <Pressable
          style={[styles.grantBtn, { backgroundColor: colors.primary }]}
          onPress={props.onSwitchToCode}
        >
          <Keyboard size={16} color={colors.primaryForeground} />
          <Text style={[styles.grantBtnText, { color: colors.primaryForeground }]}>
            Digitar Código de 6 Dígitos
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraErrorBoundary
      fallback={() => (
        <View
          style={[
            styles.permissionCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <AlertCircle size={32} color={colors.warning} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Câmera Indisponível
          </Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
            Não foi possível inicializar a câmera neste dispositivo. Utilize o código de 6 dígitos exibido no computador para parear.
          </Text>
          <Pressable
            style={[styles.grantBtn, { backgroundColor: colors.primary }]}
            onPress={props.onSwitchToCode}
          >
            <Keyboard size={16} color={colors.primaryForeground} />
            <Text style={[styles.grantBtnText, { color: colors.primaryForeground }]}>
              Inserir Código de 6 Dígitos
            </Text>
          </Pressable>
        </View>
      )}
    >
      <NativeScanner CameraModule={cameraModule} {...props} />
    </CameraErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  loadingBox: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBox: {
    width: '100%',
    height: 230,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 160,
    height: 160,
    position: 'relative',
  },
  corner: {
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
  hintText: {
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
  rescanText: {
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  permissionCard: {
    padding: 20,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
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
  },
  permissionActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  grantBtnText: {
    fontSize: 13,
    fontFamily: Typography.bold,
  },
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  altBtnText: {
    fontSize: 13,
    fontFamily: Typography.medium,
  },
});
