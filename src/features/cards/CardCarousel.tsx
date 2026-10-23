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
import { Landmark, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { BankCard } from '@/types';
import { CardItem } from './CardItem';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, LetterSpacing } from '@/theme/typography';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH / 1.586;

interface CardCarouselProps {
  cards: BankCard[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onEditSkin: (card: BankCard) => void;
  onOpenPluggy?: () => void;
  scrollY?: SharedValue<number>;
  pagerScrollX?: SharedValue<number>;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  cards,
  activeIndex,
  onIndexChange,
  onEditSkin,
  onOpenPluggy,
  scrollY,
  pagerScrollX,
}) => {
  const { colors } = useTheme();
  const privacyMode = useWalletStore((s) => s.privacyMode);
  const togglePrivacyMode = useWalletStore((s) => s.togglePrivacyMode);

  const cardScrollX = useSharedValue(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    cardScrollX.value = offsetX;
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
            onPress={onOpenPluggy}
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
                  backgroundColor: `${colors.primary}18`,
                  borderColor: `${colors.primary}36`,
                },
              ]}
            >
              <Landmark size={22} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              CONECTAR CONTA BANCÁRIA
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Vincule Nubank, Itaú, Inter ou outro banco via Open Finance para sincronizar seus cartões automaticamente.
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
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        renderItem={({ item, index }) => (
          <CardItem
            card={item}
            index={index}
            cardScrollX={cardScrollX}
            scrollY={scrollY}
            pagerScrollX={pagerScrollX}
            onEditSkin={onEditSkin}
          />
        )}
      />

      {/* Indicadores de Cartão Ativo e Toggle de Privacidade */}
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

        <Pressable
          onPress={togglePrivacyMode}
          hitSlop={10}
          style={({ pressed }) => [
            styles.eyeBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel="Ocultar ou exibir valores"
        >
          {privacyMode ? (
            <EyeOff size={13} color={colors.textSecondary} />
          ) : (
            <Eye size={13} color={colors.textSecondary} />
          )}
        </Pressable>
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
    marginTop: 8,
    paddingHorizontal: 20,
    height: 24,
    position: 'relative',
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
  eyeBtn: {
    position: 'absolute',
    right: 24,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
