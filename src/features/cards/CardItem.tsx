import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Wifi, Sparkles } from 'lucide-react-native';
import { BankCard } from '@/types';
import { useTheme } from '@/theme/useTheme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = CARD_WIDTH * 0.62;

interface CardItemProps {
  card: BankCard;
  onEditSkin: (card: BankCard) => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, onEditSkin }) => {
  const { colors } = useTheme();

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <View style={[styles.outerContainer, { shadowColor: colors.cardShadow }]}>
      <View style={[styles.cardContainer, { backgroundColor: card.gradient[0] }]}>
        {/* Wallpaper de Fundo Customizado */}
        {card.wallpaperUri ? (
          <Image
            source={{ uri: card.wallpaperUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : null}


        {/* Camada de Gradiente / Overlay para legibilidade */}
        <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]} />

        {/* Conteúdo do Cartão */}
        <View style={styles.content}>
          {/* Topo: Banco e NFC */}
          <View style={styles.topRow}>
            <View style={styles.bankTag}>
              <Text style={styles.bankName}>{card.bankName}</Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                onPress={() => onEditSkin(card)}
                style={styles.skinButton}
              >
                <Sparkles size={14} color="#FFFFFF" />
                <Text style={styles.skinButtonText}>Skin</Text>
              </Pressable>
              <Wifi size={22} color="#FFFFFF" style={styles.nfcIcon} />
            </View>
          </View>

          {/* Chip EMV Simulado */}
          <View style={styles.chipContainer}>
            <View style={styles.chip} />
          </View>

          {/* Rodapé: Número mascarado, Nome e Saldo */}
          <View style={styles.bottomRow}>
            <View>
              <Text style={styles.cardNumber}>••••  ••••  ••••  {card.lastFourDigits}</Text>
              <Text style={styles.cardholder}>{card.cardholderName}</Text>
            </View>

            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Limite Usado</Text>
              <Text style={styles.balanceValue}>{formatBRL(card.balance)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    marginHorizontal: 24,
  },
  cardContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },

  bankName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skinButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  nfcIcon: {
    transform: [{ rotate: '90deg' }],
  },
  chipContainer: {
    marginVertical: 4,
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E5C158',
    borderWidth: 1,
    borderColor: '#C49D34',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardNumber: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardholder: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
