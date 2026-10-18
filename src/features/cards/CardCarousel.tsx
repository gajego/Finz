import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';
import { Plus, CreditCard } from 'lucide-react-native';
import { BankCard } from '@/types';
import { CardItem } from './CardItem';
import { useTheme } from '@/theme/useTheme';
import { Typography, LetterSpacing } from '@/theme/typography';

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
            style={({ pressed }) => [
              styles.emptyCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderStrong,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <CreditCard size={22} color={colors.primary} strokeWidth={2} />
              <View style={[styles.emptyPlusBadge, { backgroundColor: colors.primary }]}>
                <Plus size={10} color={colors.primaryForeground} strokeWidth={3} />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              VINCULAR PRIMEIRO CARTÃO
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Cadastre Nubank, Itaú, Inter ou outro banco para gerenciar faturas e conciliar comprovantes Pix em um só lugar.
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
        nestedScrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        renderItem={({ item }) => (
          <CardItem card={item} onEditSkin={onEditSkin} />
        )}
      />

      {/* Indicadores de Cartão Ativo e Botão Pill Minimalista */}
      <View style={styles.footerRow}>
        <View style={styles.pagination}>
          {cards.map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceSubtle,
                    borderColor: isActive ? 'transparent' : colors.borderSubtle,
                    width: isActive ? 22 : 6,
                    height: 4,
                  },
                ]}
              />
            );
          })}
        </View>

        {onAddCard && (
          <Pressable
            onPress={onAddCard}
            hitSlop={8}
            style={({ pressed }) => [
              styles.addCardPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderSubtle,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={[styles.plusIconWrap, { backgroundColor: colors.badgeBackground }]}>
              <Plus size={11} color={colors.primary} strokeWidth={2.6} />
            </View>
            <Text style={[styles.addCardText, { color: colors.text }]}>NOVO CARTÃO</Text>
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
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  emptyPlusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Typography.bold,
    fontSize: 12,
    letterSpacing: LetterSpacing.wider,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Typography.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 260,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    position: 'relative',
    height: 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  bar: {
    borderRadius: 2,
    borderWidth: 0.5,
  },
  addCardPill: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  plusIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardText: {
    fontFamily: Typography.bold,
    fontSize: 9.5,
    letterSpacing: LetterSpacing.wide,
  },
});
