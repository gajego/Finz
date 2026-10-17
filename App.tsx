import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from './src/theme/useTheme';
import { useWalletStore } from './src/store/useWalletStore';
import { Header } from './src/components/ui/Header';
import { BalanceHero } from './src/components/ui/BalanceHero';
import { CardCarousel } from './src/features/cards/CardCarousel';
import { CardSkinModal } from './src/features/cards/CardSkinModal';
import { CategoryBreakdown } from './src/features/transactions/CategoryBreakdown';
import { TransactionList } from './src/features/transactions/TransactionList';
import { OnboardingModal } from './src/features/onboarding/OnboardingModal';
import { NotificationSimulatorModal } from './src/features/notifications/NotificationSimulatorModal';
import { BankCard } from './src/types';

export default function App() {
  const { colors, mode } = useTheme();
  const cards = useWalletStore((s) => s.cards);
  const activeCardIndex = useWalletStore((s) => s.activeCardIndex);
  const setActiveCardIndex = useWalletStore((s) => s.setActiveCardIndex);
  const profile = useWalletStore((s) => s.profile);

  // Modais de Controle
  const [selectedCardForSkin, setSelectedCardForSkin] = useState<BankCard | null>(null);
  const [onboardingVisible, setOnboardingVisible] = useState(!profile.onboardingCompleted);
  const [simulatorVisible, setSimulatorVisible] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Neo-Fintech com identidade de marca industrial */}
          <Header onOpenNotifications={() => setSimulatorVisible(true)} />

          {/* Saldo Brutalista, Ações Rápidas e Modo Stealth */}
          <BalanceHero />

          {/* Cartões Físicos Interativos com Física 3D por Gesto */}
          <CardCarousel
            cards={cards}
            activeIndex={activeCardIndex}
            onIndexChange={setActiveCardIndex}
            onEditSkin={(card) => setSelectedCardForSkin(card)}
          />

          {/* Metas em Grid Bento com Acento Acid Volt */}
          <CategoryBreakdown />

          {/* Extrato com Estilo Editorial Suíço e Estornos */}
          <TransactionList />
        </ScrollView>

        {/* Ateliê de Skins */}
        <CardSkinModal
          card={selectedCardForSkin}
          visible={!!selectedCardForSkin}
          onClose={() => setSelectedCardForSkin(null)}
        />

        {/* Onboarding Inicial */}
        <OnboardingModal
          visible={onboardingVisible}
          onClose={() => setOnboardingVisible(false)}
        />

        {/* Terminal de Testes de Notificação */}
        <NotificationSimulatorModal
          visible={simulatorVisible}
          onClose={() => setSimulatorVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
