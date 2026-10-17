import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { X, Check } from 'lucide-react-native';
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
    name: 'TITANIUM OBSIDIAN',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#0A0A0C', '#121217'] as [string, string],
  },
  {
    id: 'p2',
    name: 'ACID MATRIX',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#040405', '#161908'] as [string, string],
  },
  {
    id: 'p3',
    name: 'ONYX GOLD',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#1C1608', '#0A0804'] as [string, string],
  },
  {
    id: 'p4',
    name: 'CHROMATIC FOIL',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#180A2E', '#0A0514'] as [string, string],
  },
  {
    id: 'p5',
    name: 'BRUSHED DAMASCUS',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80',
    gradient: ['#141518', '#08090A'] as [string, string],
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
      updateCardSkin(card.id, customUrl.trim(), ['#08090C', '#13151B']);
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
              borderColor: colors.borderStrong,
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>ATELIÊ DE SKINS</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {card.bankName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceSubtle }]}>
              <X size={16} color={colors.text} />
            </Pressable>
          </View>

          {/* Presets de Wallpapers Físicos */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            TEXTURAS & MATERIAIS DE ALTA DEFINIÇÃO
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            {WALLPAPER_PRESETS.map((preset) => {
              const isSelected = card.wallpaperUri === preset.url;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => handleSelectPreset(preset.url, preset.gradient)}
                  style={[
                    styles.presetItem,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { borderWidth: 2 },
                  ]}
                >
                  <Image source={{ uri: preset.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={styles.presetOverlay} />
                  <Text style={styles.presetName}>{preset.name}</Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Check size={10} color={colors.primaryForeground} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Inserir URL de imagem externa */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 18 }]}>
            OU VINCULE UM WALLPAPER PRÓPRIO
          </Text>
          <View style={styles.customRow}>
            <TextInput
              placeholder="https://exemplo.com/sua-imagem.png"
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
              <Text style={[styles.applyButtonText, { color: colors.primaryForeground }]}>
                APLICAR
              </Text>
            </Pressable>
          </View>

          {/* Remover wallpaper */}
          {card.wallpaperUri && (
            <Pressable onPress={handleRemoveWallpaper} style={styles.removeButton}>
              <Text style={[styles.removeButtonText, { color: colors.danger }]}>
                RESTAURAR VISUAL PADRÃO DE FÁBRICA
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  presetsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  presetItem: {
    width: 120,
    height: 75,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 8,
    borderWidth: 1,
  },
  presetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  presetName: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    zIndex: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 12,
  },
  applyButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  removeButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
