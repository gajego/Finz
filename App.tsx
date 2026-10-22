import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
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
import { TransactionDetailsModal } from './src/features/transactions/TransactionDetailsModal';
import { OnboardingModal } from './src/features/onboarding/OnboardingModal';
import { NotificationCenterModal } from './src/features/notifications/NotificationCenterModal';
import { PluggyConnectModal } from './src/features/pluggy/PluggyConnectModal';
import { syncPluggyItem, syncAllPluggyItems } from './src/services/pluggy/pluggyService';
import { usePluggyMonitor } from './src/services/pluggy/pluggyMonitor';
import { initNotifications } from './src/services/notifications/notificationService';
import { BankCard, Transaction } from './src/types';
import * as Notifications from 'expo-notifications';

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
  const transactions = useWalletStore((s) => s.transactions);
  const activeCardIndex = useWalletStore((s) => s.activeCardIndex);
  const setActiveCardIndex = useWalletStore((s) => s.setActiveCardIndex);
  const profile = useWalletStore((s) => s.profile);

  // Monitoramento periódico contínuo da Pluggy a cada 10 segundos com requisições teste e diff de transações
  usePluggyMonitor(10000);

  useEffect(() => {
    initStore();
    initNotifications();
  }, [initStore]);

  // Modais de Controle
  const [selectedCardForSkin, setSelectedCardForSkin] = useState<BankCard | null>(null);
  const [addCardVisible, setAddCardVisible] = useState(false);
  const [pluggyModalVisible, setPluggyModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<string | undefined>();
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [isSyncingPluggy, setIsSyncingPluggy] = useState(false);
  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<Transaction | null>(null);

  const activeTransaction = selectedTransactionForDetails
    ? transactions.find((t) => t.id === selectedTransactionForDetails.id) || selectedTransactionForDetails
    : null;

  // Escuta cliques em notificações nativas para redirecionar diretamente aos detalhes da transação
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      const txId = (data?.transactionId || data?.txId) as string | undefined;
      if (txId) {
        const currentTxs = useWalletStore.getState().transactions;
        const found = currentTxs.find((t) => t.id === txId);
        if (found) {
          setSelectedTransactionForDetails(found);
        }
      }
    });

    // Trata clique na notificação quando o aplicativo é iniciado do zero (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data;
        const txId = (data?.transactionId || data?.txId) as string | undefined;
        if (txId) {
          const currentTxs = useWalletStore.getState().transactions;
          const found = currentTxs.find((t) => t.id === txId);
          if (found) {
            setSelectedTransactionForDetails(found);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Sincronização manual acionada pelo usuário na barra Open Finance
  const handleSyncPluggy = async () => {
    setIsSyncingPluggy(true);
    try {
      const res = await syncAllPluggyItems();
      if (res.cardsTotal > 0 || res.txTotal > 0) {
        Alert.alert(
          'Open Finance Atualizado',
          `Sucesso! ${res.cardsTotal} cartão(ões) e ${res.txTotal} movimentação(ões) sincronizados.`
        );
      } else {
        Alert.alert('Open Finance', 'Tudo atualizado! Nenhuma nova movimentação pendente.');
      }
    } catch (e: any) {
      Alert.alert('Erro ao sincronizar', e?.message || 'Falha ao sincronizar dados com o Open Finance.');
    } finally {
      setIsSyncingPluggy(false);
    }
  };

  // Escuta retornos da autorização do Open Finance (Mobile deep link e Web redirect)
  useEffect(() => {
    const getWebUrl = () => {
      try {
        return typeof window !== 'undefined' && window.location ? window.location.href : '';
      } catch {
        return '';
      }
    };

    const handleUrl = async (event: { url: string }) => {
      const url = event.url || getWebUrl();
      if (url && (url.includes('pluggy-callback') || /item_?id=/i.test(url))) {
        const match = url.match(/item_?id=([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          try {
            const { cardsCount, txCount } = await syncPluggyItem(match[1]);
            Alert.alert(
              'Banco Conectado!',
              `Sucesso! ${cardsCount} cartão(ões) e ${txCount} transação(ões) foram importados para o Finz.`
            );
            if (typeof window !== 'undefined' && window.history && window.location) {
              window.history.replaceState({}, '', window.location.pathname);
            }
          } catch (e: any) {
            Alert.alert('Erro ao sincronizar', e?.message || 'Falha ao importar dados do banco conectado.');
          }
        }
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      const currentUrl = url || getWebUrl();
      if (currentUrl) handleUrl({ url: currentUrl });
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (isInitialized && !profile.onboardingCompleted) {
      setOnboardingVisible(true);
    }
  }, [isInitialized, profile.onboardingCompleted]);


  // Paginação dinâmica por rolagem para baixo do extrato (lotes de 30)
  const [txVisibleCount, setTxVisibleCount] = useState(30);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Dispara carregamento de mais itens quando o scroll estiver a 250px do final
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 250) {
      setTxVisibleCount((prev) => prev + 30);
    }
  };

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
          scrollEventThrottle={32}
          onScroll={handleScroll}
        >
          {/* Header Neo-Fintech com identidade de marca industrial */}
          <Header
            onOpenNotifications={() => setNotificationsVisible(true)}
            onOpenPluggy={() => setPluggyModalVisible(true)}
          />

          {/* Saldo Brutalista, Limites e Barra de Ação Open Finance */}
          <BalanceHero
            onOpenPluggy={() => setPluggyModalVisible(true)}
            onSyncNow={handleSyncPluggy}
            isSyncing={isSyncingPluggy}
          />

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
          <TransactionList
            visibleCount={txVisibleCount}
            pageSize={30}
            onEndReached={() => setTxVisibleCount((prev) => prev + 30)}
            onPressTransaction={(tx) => {
              console.log('[App] 🔍 Abrindo detalhes da transação:', tx.id, tx.merchant);
              setSelectedTransactionForDetails(tx);
            }}
          />
        </ScrollView>

        {/* Modal de Adição de Cartão */}
        <AddCardModal
          visible={addCardVisible}
          onClose={() => setAddCardVisible(false)}
          onOpenPluggy={() => {
            setAddCardVisible(false);
            setPluggyModalVisible(true);
          }}
        />

        {/* Modal Open Finance Pluggy */}
        <PluggyConnectModal
          visible={pluggyModalVisible}
          onClose={() => setPluggyModalVisible(false)}
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

        {/* Detalhes da Movimentação e Alteração de Categoria */}
        <TransactionDetailsModal
          visible={!!selectedTransactionForDetails}
          transaction={activeTransaction}
          onClose={() => setSelectedTransactionForDetails(null)}
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
