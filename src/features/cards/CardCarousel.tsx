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
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <CardItem card={item} onEditSkin={onEditSkin} />
        )}
      />

      {/* Indicadores de Paginação */}
      <View style={styles.pagination}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? colors.primary : colors.borderLight,
                width: i === activeIndex ? 22 : 6,
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
    marginVertical: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
