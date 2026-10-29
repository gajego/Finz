import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  useWindowDimensions,
  RefreshControl,
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
import { AlertBanner } from './src/components/ui/AlertBanner';
import { CardCarousel } from './src/features/cards/CardCarousel';
import { CardSkinModal } from './src/features/cards/CardSkinModal';
import { CategoryBreakdown } from './src/features/transactions/CategoryBreakdown';
import { DailyBurnRateCard } from './src/features/insights/DailyBurnRateCard';
import { BudgetModal } from './src/features/budgets/BudgetModal';
import { TransactionList } from './src/features/transactions/TransactionList';
import { TransactionDetailsModal } from './src/features/transactions/TransactionDetailsModal';
import { UncategorizedTransactionsModal } from './src/features/transactions/UncategorizedTransactionsModal';
import { OnboardingModal } from './src/features/onboarding/OnboardingModal';
import { NotificationCenterModal } from './src/features/notifications/NotificationCenterModal';
import { ProfileModal } from './src/features/profile/ProfileModal';
import { PluggyConnectModal } from './src/features/pluggy/PluggyConnectModal';
import { FloatingBottomNav, MainTab } from './src/components/ui/FloatingBottomNav';
import { FloatingTabsQuickMenu } from './src/components/ui/FloatingTabsQuickMenu';
import { GoalsScreen } from './src/features/categories/GoalsScreen';
import { PerformanceScreen } from './src/features/performance/PerformanceScreen';
import { InsightsScreen } from './src/features/insights/InsightsScreen';
import { InvestmentsScreen } from './src/features/investments/InvestmentsScreen';
import { AppSplashLoader } from './src/components/ui/AppSplashLoader';
import { syncPluggyItem, syncAllPluggyItems } from './src/services/pluggy/pluggyService';
import { usePluggyMonitor } from './src/services/pluggy/pluggyMonitor';
import { initNotifications, notifyUncategorizedTransactions } from './src/services/notifications/notificationService';
import { loadLastUncategorizedCount, persistLastUncategorizedCount } from './src/services/database/db';
import { BankCard, Transaction } from './src/types';
import { useSharedValue } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

const MAIN_TABS: MainTab[] = ['home', 'performance', 'insights', 'goals', 'investments'];

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
  const [pluggyModalVisible, setPluggyModalVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<string | undefined>();
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [uncategorizedModalVisible, setUncategorizedModalVisible] = useState(false);
  const [isSyncingPluggy, setIsSyncingPluggy] = useState(false);
  const [selectedTransactionForDetails, setSelectedTransactionForDetails] = useState<Transaction | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('home');
  const [pagerScrollEnabled, setPagerScrollEnabled] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);
  const [minPresentationElapsed, setMinPresentationElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinPresentationElapsed(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const isAppReady = Boolean(fontsLoaded && isInitialized && minPresentationElapsed);
  const { width: screenWidth } = useWindowDimensions();
  const horizontalScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const isProgrammaticScrollRef = useRef(false);
  const homeScrollY = useSharedValue(0);
  const pagerScrollX = useSharedValue(0);

  const handleTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    const targetIndex = MAIN_TABS.indexOf(tab);
    if (targetIndex >= 0 && horizontalScrollRef.current) {
      isProgrammaticScrollRef.current = true;
      horizontalScrollRef.current.scrollTo({
        x: targetIndex * screenWidth,
        animated: true,
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 450);
    }
  };

  const handleHorizontalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    pagerScrollX.value = offsetX;
    if (isProgrammaticScrollRef.current) return;
    const pageIndex = Math.round(offsetX / screenWidth);
    const nextTab = MAIN_TABS[pageIndex];
    if (nextTab && nextTab !== activeMainTab) {
      setActiveMainTab(nextTab);
    }
  };

  useEffect(() => {
    const targetIndex = MAIN_TABS.indexOf(activeMainTab);
    if (targetIndex >= 0 && horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({
        x: targetIndex * screenWidth,
        animated: false,
      });
    }
  }, [screenWidth]);

  const activeTransaction = selectedTransactionForDetails
    ? transactions.find((t) => t.id === selectedTransactionForDetails.id) || selectedTransactionForDetails
    : null;

  // Notificação inteligente apenas quando o volume de gastos não categorizados aumentar
  useEffect(() => {
    if (!isInitialized) return;

    const uncatList = transactions.filter(
      (t) =>
        t.type === 'EXPENSE' &&
        (t.categoryId === 'cat_others' || !t.categoryId || t.categoryId === '')
    );
    const currentCount = uncatList.length;
    const lastCount = loadLastUncategorizedCount();

    if (lastCount === null) {
      // Primeira inicialização com a nova regra: grava o marco base sem notificar
      persistLastUncategorizedCount(currentCount);
    } else if (currentCount > lastCount) {
      // A quantidade de não categorizadas aumentou: notifica e atualiza o marco
      persistLastUncategorizedCount(currentCount);
      const total = uncatList.reduce((acc, t) => acc + t.amount, 0);
      notifyUncategorizedTransactions(currentCount, total);
    } else if (currentCount < lastCount) {
      // O usuário categorizou transações: atualiza o marco para refletir a redução
      persistLastUncategorizedCount(currentCount);
    }
  }, [isInitialized, transactions]);

  // Escuta cliques em notificações nativas para redirecionar diretamente
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type === 'UNCATEGORIZED_TRANSACTIONS') {
        setUncategorizedModalVisible(true);
        return;
      }
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
        if (data?.type === 'UNCATEGORIZED_TRANSACTIONS') {
          setUncategorizedModalVisible(true);
          return;
        }
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

  // Sincronização acionada pelo pull-to-refresh do usuário
  const handleSyncPluggy = async () => {
    setIsSyncingPluggy(true);
    try {
      await syncAllPluggyItems();
    } catch (e: any) {
      console.warn('[Pluggy] Falha ao sincronizar dados Open Finance:', e?.message);
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
    homeScrollY.value = contentOffset.y;
    // Dispara carregamento de mais itens quando o scroll estiver a 250px do final
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 250) {
      setTxVisibleCount((prev) => prev + 30);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#040405' }}>
        <StatusBar style="light" />
        <AppSplashLoader isReady={false} onFinish={() => setSplashMounted(false)} />
      </View>
    );
  }

  const handleOpenBudgetModal = (categoryId?: string) => {
    setSelectedCategoryForBudget(categoryId);
    setBudgetModalVisible(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

        {/* Header Neo-Fintech unificado com identidade de marca */}
        <Header
          onOpenNotifications={() => setNotificationsVisible(true)}
          onOpenPluggy={() => setPluggyModalVisible(true)}
          onOpenProfile={() => setProfileVisible(true)}
        />

        {/* Pager Horizontal com Navegação por Gesto de Arrastar para o Lado */}
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={pagerScrollEnabled}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          onScroll={handleHorizontalScroll}
          onMomentumScrollEnd={handleHorizontalScroll}
          onScrollEndDrag={handleHorizontalScroll}
          style={{ flex: 1 }}
        >
          {/* Tela 1: Início */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              scrollEventThrottle={32}
              onScroll={handleScroll}
              refreshControl={
                <RefreshControl
                  refreshing={isSyncingPluggy}
                  onRefresh={handleSyncPluggy}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                  progressBackgroundColor={mode === 'dark' ? colors.surfaceElevated : colors.surface}
                />
              }
            >
              {/* Alerta Inteligente Vermelho quando limite é atingido ou Âmbar para Não Categorizadas */}
              <AlertBanner
                onOpenBudgetManager={() => handleTabChange('goals')}
                onOpenUncategorized={() => setUncategorizedModalVisible(true)}
              />

              {/* Cartões Físicos Interativos com Física 3D por Gesto */}
              <CardCarousel
                cards={cards}
                activeIndex={activeCardIndex}
                onIndexChange={setActiveCardIndex}
                onEditSkin={(card) => setSelectedCardForSkin(card)}
                onOpenPluggy={() => setPluggyModalVisible(true)}
                scrollY={homeScrollY}
                pagerScrollX={pagerScrollX}
              />

              {/* Ritmo de Gasto Diário (Cota Segura de Hoje) */}
              <DailyBurnRateCard onPressDetails={() => handleTabChange('insights')} />

              {/* Metas em Grid Bento com Acento Acid Volt e Padrão Vermelho */}
              <CategoryBreakdown onOpenBudgetManager={() => handleTabChange('goals')} />

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
          </View>

          {/* Tela 2: Desempenho */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <PerformanceScreen
              onPressTransaction={(tx) => setSelectedTransactionForDetails(tx)}
              onSetScrollEnabled={setPagerScrollEnabled}
            />
          </View>

          {/* Tela 3: Inteligência Financeira */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <InsightsScreen onNavigateToGoals={() => handleTabChange('goals')} />
          </View>

          {/* Tela 4: Metas */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <GoalsScreen />
          </View>

          {/* Tela 5: Investimentos */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <InvestmentsScreen />
          </View>
        </ScrollView>

        {/* Menu Flutuante ao Fundo da Tela (Início / Desempenho / Metas / Ativos) */}
        <FloatingBottomNav
          activeTab={activeMainTab}
          onTabChange={handleTabChange}
        />

        {/* Círculo Flutuante no Canto Inferior Direito para Seleção Rápida de Telas/Abas */}
        <FloatingTabsQuickMenu
          activeTab={activeMainTab}
          onSelectTab={handleTabChange}
        />

        {/* Menu de Perfil e Ajustes */}
        <ProfileModal
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
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
          onNavigateToAddCard={() => setPluggyModalVisible(true)}
          onNavigateToUncategorized={() => setUncategorizedModalVisible(true)}
        />

        {/* Modal de Transações Não Categorizadas */}
        <UncategorizedTransactionsModal
          visible={uncategorizedModalVisible}
          onClose={() => setUncategorizedModalVisible(false)}
        />

        {/* Detalhes da Movimentação e Alteração de Categoria */}
        <TransactionDetailsModal
          visible={!!selectedTransactionForDetails}
          transaction={activeTransaction}
          onClose={() => setSelectedTransactionForDetails(null)}
        />

        {/* Loader de Apresentação Cinematográfico Estilo Nubank / Neo-Fintech */}
        {splashMounted && (
          <AppSplashLoader
            isReady={isAppReady}
            onFinish={() => setSplashMounted(false)}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
});
