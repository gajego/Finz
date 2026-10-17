import React from 'react';
import { View, StyleSheet, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { BankCard } from '@/types';
import { CardItem } from './CardItem';
import { useTheme } from '@/theme/useTheme';

const { width } = Dimensions.get('window');

interface CardCarouselProps {
  cards: BankCard[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onEditSkin: (card: BankCard) => void;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  cards,
  activeIndex,
  onIndexChange,
  onEditSkin,
}) => {
  const { colors } = useTheme();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== activeIndex && index >= 0 && index < cards.length) {
      onIndexChange(index);
    }
  };

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

      {/* Indicadores de Cartão Ativo Minimalistas */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  bar: {
    height: 3,
    borderRadius: 1.5,
  },
});
