import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { X, Check, Image as ImageIcon } from 'lucide-react-native';
import { BankCard } from '@/types';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';

interface CardSkinModalProps {
  card: BankCard | null;
  visible: boolean;
  onClose: () => void;
}

const WALLPAPER_PRESETS = [
  {
    id: 'p1',
    name: 'Cyber Void',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    gradient: ['#0F172A', '#1E293B'] as [string, string],
  },
  {
    id: 'p2',
    name: 'Aurora Neon',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80',
    gradient: ['#00F59B', '#6366F1'] as [string, string],
  },
  {
    id: 'p3',
    name: 'Liquid Gold',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    gradient: ['#F59E0B', '#78350F'] as [string, string],
  },
  {
    id: 'p4',
    name: 'Dark Nebula',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    gradient: ['#7C3AED', '#312E81'] as [string, string],
  },
  {
    id: 'p5',
    name: 'Carbon Matrix',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    gradient: ['#111827', '#030712'] as [string, string],
  },
];

export const CardSkinModal: React.FC<CardSkinModalProps> = ({ card, visible, onClose }) => {
  const { colors, mode } = useTheme();
  const updateCardSkin = useWalletStore((s) => s.updateCardSkin);
  const [customUrl, setCustomUrl] = useState('');

  if (!card) return null;

  const handleSelectPreset = (url: string, gradient: [string, string]) => {
    updateCardSkin(card.id, url, gradient);
    onClose();
  };

  const handleApplyCustomUrl = () => {
    if (customUrl.trim().length > 0) {
      updateCardSkin(card.id, customUrl.trim(), ['#111827', '#1F2937']);
      setCustomUrl('');
      onClose();
    }
  };

  const handleRemoveWallpaper = () => {
    updateCardSkin(card.id, undefined, card.gradient);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: mode === 'dark' ? colors.surface : colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Skins & Wallpapers</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Personalize o visual do seu {card.bankName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.borderLight }]}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Galeria de Presets */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>WALLPAPERS MODERNOS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            {WALLPAPER_PRESETS.map((preset) => {
              const isSelected = card.wallpaperUri === preset.url;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => handleSelectPreset(preset.url, preset.gradient)}
                  style={[
                    styles.presetItem,
                    isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Image source={{ uri: preset.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={styles.presetOverlay} />
                  <Text style={styles.presetName}>{preset.name}</Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Check size={12} color="#0B0D13" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Opção Customizada por URL */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 18 }]}>
            OU COLE O LINK DE UMA IMAGEM
          </Text>
          <View style={styles.customRow}>
            <TextInput
              placeholder="https://sua-imagem.com/foto.jpg"
              placeholderTextColor={colors.textMuted}
              value={customUrl}
              onChangeText={setCustomUrl}
              style={[
                styles.input,
                {
                  backgroundColor: mode === 'dark' ? colors.background : colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
            <Pressable
              onPress={handleApplyCustomUrl}
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.applyButtonText}>Salvar</Text>
            </Pressable>
          </View>

          {/* Remover wallpaper */}
          {card.wallpaperUri && (
            <Pressable onPress={handleRemoveWallpaper} style={styles.removeButton}>
              <Text style={[styles.removeButtonText, { color: colors.danger }]}>
                Remover wallpaper atual
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  presetsRow: {
    gap: 12,
    paddingBottom: 8,
  },
  presetItem: {
    width: 110,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  presetName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    zIndex: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  customRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  applyButton: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#0B0D13',
    fontWeight: '700',
    fontSize: 13,
  },
  removeButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
