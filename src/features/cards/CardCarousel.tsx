import React from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import { Plus, CreditCard } from 'lucide-react-native';
import { BankCard } from '@/types';
import { CardItem } from './CardItem';
import { useTheme } from '@/theme/useTheme';
import { Typography } from '@/theme/typography';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH / 1.586;

interface CardCarouselProps {
  cards: BankCard[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onEditSkin: (card: BankCard) => void;
  onAddCard?: () => void;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  cards,
  activeIndex,
  onIndexChange,
  onEditSkin,
  onAddCard,
}) => {
  const { colors } = useTheme();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== activeIndex && index >= 0 && index < cards.length) {
      onIndexChange(index);
    }
  };

  if (cards.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyWrapper}>
          <Pressable
            onPress={onAddCard}
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
              <Plus size={22} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>VINCULAR PRIMEIRO CARTÃO</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Cadastre Nubank, Itaú, Inter ou outro banco para gerenciar faturas e conciliar comprovantes Pix.
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <CardItem card={item} onEditSkin={onEditSkin} />
        )}
      />

      {/* Indicadores de Cartão Ativo Minimalistas e Botão Novo */}
      <View style={styles.footerRow}>
        <View style={styles.pagination}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  backgroundColor: i === activeIndex ? colors.primary : colors.surfaceSubtle,
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {onAddCard && (
          <Pressable onPress={onAddCard} hitSlop={10} style={styles.addCardBtn}>
            <Plus size={13} color={colors.primary} />
            <Text style={[styles.addCardText, { color: colors.primary }]}>NOVO CARTÃO</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  emptyWrapper: {
    width,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 240,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
    height: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  bar: {
    height: 3,
    borderRadius: 1.5,
  },
  addCardBtn: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCardText: {
    fontFamily: Typography.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
});
