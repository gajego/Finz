import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './src/theme/useTheme';
import { useWalletStore } from './src/store/useWalletStore';
import { Header } from './src/components/ui/Header';
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

  // Modais
  const [selectedCardForSkin, setSelectedCardForSkin] = useState<BankCard | null>(null);
  const [onboardingVisible, setOnboardingVisible] = useState(!profile.onboardingCompleted);
  const [simulatorVisible, setSimulatorVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Topo do App com alternador de tema e dados do usuário */}
        <Header onOpenNotifications={() => setSimulatorVisible(true)} />

        {/* Carrossel de Cartões Customizáveis com Wallpapers */}
        <CardCarousel
          cards={cards}
          activeIndex={activeCardIndex}
          onIndexChange={setActiveCardIndex}
          onEditSkin={(card) => setSelectedCardForSkin(card)}
        />

        {/* Divisão de Gastos e Metas por Categoria */}
        <CategoryBreakdown />

        {/* Histórico Completo de Transações e Estornos */}
        <TransactionList />
      </ScrollView>

      {/* Modal de Customização de Skin do Cartão */}
      <CardSkinModal
        card={selectedCardForSkin}
        visible={!!selectedCardForSkin}
        onClose={() => setSelectedCardForSkin(null)}
      />

      {/* Modal de Onboarding Inicial (Dados Pessoais & Apelido) */}
      <OnboardingModal
        visible={onboardingVisible}
        onClose={() => setOnboardingVisible(false)}
      />

      {/* Simulador de Push de Bancos para Testes */}
      <NotificationSimulatorModal
        visible={simulatorVisible}
        onClose={() => setSimulatorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
