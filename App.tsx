import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Ubuntu_300Light,
  Ubuntu_400Regular,
  Ubuntu_500Medium,
  Ubuntu_700Bold,
} from '@expo-google-fonts/ubuntu';
import { useTheme } from './src/theme/useTheme';
import { useWalletStore } from './src/store/useWalletStore';
import { Header } from './src/components/ui/Header';
import { BalanceHero } from './src/components/ui/BalanceHero';
import { AlertBanner } from './src/components/ui/AlertBanner';
import { CardCarousel } from './src/features/cards/CardCarousel';
import { CardSkinModal } from './src/features/cards/CardSkinModal';
import { AddCardModal } from './src/features/cards/AddCardModal';
import { CategoryBreakdown } from './src/features/transactions/CategoryBreakdown';
import { BudgetModal } from './src/features/budgets/BudgetModal';
import { TransactionList } from './src/features/transactions/TransactionList';
import { OnboardingModal } from './src/features/onboarding/OnboardingModal';
import { NotificationCenterModal } from './src/features/notifications/NotificationCenterModal';
import { ReceiptImportModal } from './src/features/receipts/ReceiptImportModal';
import { ReceiptPickerSheet } from './src/features/receipts/ReceiptPickerSheet';
import { ParsedReceipt } from './src/services/receipts/receiptParser';
import { useShareReceiver } from './src/services/receipts/useShareReceiver';
import { BankCard } from './src/types';

export default function App() {
  const [fontsLoaded] = useFonts({
    Ubuntu_300Light,
    Ubuntu_400Regular,
    Ubuntu_500Medium,
    Ubuntu_700Bold,
  });

  const { colors, mode } = useTheme();
  const initStore = useWalletStore((s) => s.initStore);
  const isInitialized = useWalletStore((s) => s.isInitialized);
  const cards = useWalletStore((s) => s.cards);
  const activeCardIndex = useWalletStore((s) => s.activeCardIndex);
  const setActiveCardIndex = useWalletStore((s) => s.setActiveCardIndex);
  const profile = useWalletStore((s) => s.profile);

  useEffect(() => {
    initStore();
  }, [initStore]);

  // Modais de Controle
  const [selectedCardForSkin, setSelectedCardForSkin] = useState<BankCard | null>(null);
  const [addCardVisible, setAddCardVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<string | undefined>();
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [receiptPickerVisible, setReceiptPickerVisible] = useState(false);
  const [importedReceipt, setImportedReceipt] = useState<ParsedReceipt | null>(null);

  // Escuta compartilhamentos externos de comprovantes (SEND / SEND_MULTIPLE de outros apps)
  useShareReceiver((receipt) => {
    setImportedReceipt(receipt);
  });

  useEffect(() => {
    if (isInitialized && !profile.onboardingCompleted) {
      setOnboardingVisible(true);
    }
  }, [isInitialized, profile.onboardingCompleted]);


  if (!fontsLoaded) {
    return null;
  }

  const handleOpenBudgetModal = (categoryId?: string) => {
    setSelectedCategoryForBudget(categoryId);
    setBudgetModalVisible(true);
  };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Neo-Fintech com identidade de marca industrial */}
          <Header onOpenNotifications={() => setNotificationsVisible(true)} />

          {/* Saldo Brutalista, Ações Rápidas e Leitor de Comprovante */}
          <BalanceHero onOpenReceiptPicker={() => setReceiptPickerVisible(true)} />

          {/* Alerta Inteligente Vermelho quando limite é atingido */}
          <AlertBanner onOpenBudgetManager={() => handleOpenBudgetModal()} />

          {/* Cartões Físicos Interativos com Física 3D por Gesto */}
          <CardCarousel
            cards={cards}
            activeIndex={activeCardIndex}
            onIndexChange={setActiveCardIndex}
            onEditSkin={(card) => setSelectedCardForSkin(card)}
            onAddCard={() => setAddCardVisible(true)}
          />

          {/* Metas em Grid Bento com Acento Acid Volt e Padrão Vermelho */}
          <CategoryBreakdown onOpenBudgetManager={handleOpenBudgetModal} />

          {/* Extrato com Estilo Editorial Suíço e Estornos */}
          <TransactionList />
        </ScrollView>

        {/* Modal de Adição de Cartão */}
        <AddCardModal
          visible={addCardVisible}
          onClose={() => setAddCardVisible(false)}
        />

        {/* Modal de Gestão de Metas por Categoria */}
        <BudgetModal
          visible={budgetModalVisible}
          initialCategoryId={selectedCategoryForBudget}
          onClose={() => setBudgetModalVisible(false)}
        />

        {/* Ateliê de Skins de Cartões */}
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

        {/* Central de Notificações em Tempo Real (Zero Mocks) */}
        <NotificationCenterModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          onNavigateToBudgets={handleOpenBudgetModal}
          onNavigateToAddCard={() => setAddCardVisible(true)}
        />

        {/* Folha de Seleção e Leitura de Comprovante (Foto / PDF) */}
        <ReceiptPickerSheet
          visible={receiptPickerVisible}
          onClose={() => setReceiptPickerVisible(false)}
          onReceiptExtracted={(receipt) => setImportedReceipt(receipt)}
        />

        {/* Modal de Comprovante Pix Identificado */}
        <ReceiptImportModal
          receipt={importedReceipt}
          visible={!!importedReceipt}
          onClose={() => setImportedReceipt(null)}
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
