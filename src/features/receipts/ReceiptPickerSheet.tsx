import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Image as ImageIcon, FileText, X, Sparkles, UploadCloud } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';
import { readReceiptFromFileOrUri, isImageOcrAvailable } from '@/services/receipts/universalReceiptReader';
import { ParsedReceipt } from '@/services/receipts/receiptParser';

interface ReceiptPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onReceiptExtracted: (receipt: ParsedReceipt) => void;
}

export const ReceiptPickerSheet: React.FC<ReceiptPickerSheetProps> = ({
  visible,
  onClose,
  onReceiptExtracted,
}) => {
  const { colors, mode } = useTheme();
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        processUri(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível acessar a galeria.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const lowerName = (asset.name || asset.uri).toLowerCase();
        let mime = asset.mimeType;
        if (!mime) {
          if (lowerName.includes('.pdf')) {
            mime = 'application/pdf';
          } else if (lowerName.includes('.heic') || lowerName.includes('.heif')) {
            mime = 'image/heic';
          } else if (lowerName.includes('.png')) {
            mime = 'image/png';
          } else {
            mime = 'image/jpeg';
          }
        }
        processUri(asset.uri, mime);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  const processUri = async (uri: string, mimeType?: string) => {
    const lower = uri.toLowerCase();
    const isImage =
      mimeType?.startsWith('image/') ||
      lower.includes('.jpg') ||
      lower.includes('.jpeg') ||
      lower.includes('.png') ||
      lower.includes('.webp') ||
      lower.includes('.heic') ||
      lower.includes('.heif');

    if (isImage && !isImageOcrAvailable()) {
      Alert.alert(
        'OCR em Imagem (Expo Go)',
        'O reconhecimento óptico em imagens utiliza o Google ML Kit nativo, indisponível no cliente Expo Go.\n\n' +
          '💡 Como testar agora:\n' +
          '1. Exporte o comprovante em PDF pelo app do banco (funciona 100% no Expo Go, sem precisar de módulos nativos);\n' +
          '2. Ou utilize o aplicativo instalado pelo build nativo (IPA no iOS ou APK no Android).'
      );
      return;
    }

    setLoading(true);
    try {
      const parsed = await readReceiptFromFileOrUri(uri, mimeType);
      setLoading(false);
      if (parsed) {
        onClose();
        onReceiptExtracted(parsed);
      } else {
        Alert.alert(
          'Comprovante Não Reconhecido',
          'Não conseguimos extrair o valor ou destinatário deste arquivo. Certifique-se de que é um comprovante Pix legível.'
        );
      }
    } catch {
      setLoading(false);
      Alert.alert('Erro', 'Ocorreu uma falha ao ler o arquivo.');
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
          {/* Topo */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Sparkles size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>OCR & PDF LOCAL</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>IMPORTAR COMPROVANTE</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                O Finz lê a imagem ou arquivo PDF offline no seu aparelho.
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Processando OCR e decodificando comprovante...
              </Text>
            </View>
          ) : (
            <View style={styles.optionsList}>
              {/* Opção 1: Galeria / Screenshot */}
              <Pressable
                onPress={handlePickImage}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <ImageIcon size={22} color={colors.primary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    FOTO / PRINTSCREEN DA GALERIA
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Lê capturas de tela do app do Nubank, Itaú, Inter, etc.
                  </Text>
                </View>
              </Pressable>

              {/* Opção 2: Arquivo PDF */}
              <Pressable
                onPress={handlePickDocument}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <FileText size={22} color={colors.secondary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    ARQUIVO PDF DO COMPROVANTE
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Importa o PDF oficial exportado pelo seu banco.
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  badgeText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: Typography.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  optionSubtitle: {
    fontFamily: Typography.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontFamily: Typography.medium,
    fontSize: 13,
  },
});
