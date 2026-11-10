import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Search, X, History, Zap } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useWalletStore } from '@/store/useWalletStore';
import { Typography, Radii } from '@/theme/typography';
import { Transaction } from '@/types';
import { TransactionItem } from './TransactionItem';
import { useSwipeModalDismiss, ModalTopHandle } from '@/components/ui/SwipeableModalSheet';

interface SearchTransactionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
}

const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const SearchTransactionsModal: React.FC<SearchTransactionsModalProps> = ({
  visible,
  onClose,
  onSelectTransaction,
}) => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const transactions = useWalletStore((s) => s.transactions);

  const [query, setQuery] = useState('');
  const inputRef = useRef<any>(null);

  const {
    handlePanResponder,
    headerPanResponder,
    animatedSheetStyle,
  } = useSwipeModalDismiss({ onClose, visible });

  // Foco automático no input ao abrir o modal
  useEffect(() => {
    if (visible) {
      setQuery('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Sugestões inteligentes baseadas nos estabelecimentos mais frequentes
  const topSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      const name = (t.merchant || '').trim();
      if (!name || name.length < 2) continue;
      // Pega os primeiros 20 caracteres para sugestões limpas
      const shortName = name.split(' - ')[0].split(' *')[0].slice(0, 18).trim();
      counts.set(shortName, (counts.get(shortName) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [transactions]);

  // Transações filtradas em tempo real
  const filteredTransactions = useMemo(() => {
    const cleanQuery = normalizeText(query);
    if (!cleanQuery) {
      // Se não digitou nada, exibe as 25 mais recentes para conveniência
      return transactions.slice(0, 25);
    }

    return transactions.filter((t) => {
      const normMerchant = normalizeText(t.merchant);
      const normRaw = normalizeText(t.rawText || '');
      return normMerchant.includes(cleanQuery) || normRaw.includes(cleanQuery);
    });
  }, [transactions, query]);

  const handleSelect = (tx: Transaction) => {
    onSelectTransaction(tx);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <Animated.View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                borderColor: colors.borderSubtle,
              },
              animatedSheetStyle,
            ]}
          >
            <SafeAreaView style={styles.sheetSafeContent}>
              {/* Alça Superior com Gesto Fluido de Puxar para Fechar */}
              <ModalTopHandle
                panHandlers={handlePanResponder.panHandlers}
                color={colors.borderStrong}
              />

              {/* Cabeçalho */}
              <View
                {...headerPanResponder.panHandlers}
                style={styles.headerRow}
              >
              <View>
                <Text style={[styles.headerPreTitle, { color: colors.primary }]}>
                  BUSCA INTELIGENTE
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Buscar Transações
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Fechar busca"
              >
                <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Barra de Pesquisa */}
            <View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: query.length > 0 ? colors.primary : colors.borderSubtle,
                },
              ]}
            >
              <Search
                size={18}
                color={query.length > 0 ? colors.primary : colors.textSecondary}
                strokeWidth={2.2}
              />

              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Nome da loja, estabelecimento ou termo..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />

              {query.length > 0 && Platform.OS !== 'ios' && (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  style={styles.clearButton}
                >
                  <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
                </Pressable>
              )}
            </View>

            {/* Tags / Sugestões de Pesquisa Rápida */}
            {topSuggestions.length > 0 && (
              <View style={styles.chipsSection}>
                <View style={styles.chipsLabelRow}>
                  <Zap size={12} color={colors.primary} strokeWidth={2.4} />
                  <Text style={[styles.chipsLabel, { color: colors.textSecondary }]}>
                    SUGESTÕES RÁPIDAS
                  </Text>
                </View>

                <View style={styles.chipsRow}>
                  {topSuggestions.map((suggestion) => {
                    const isSelected = query.toLowerCase() === suggestion.toLowerCase();
                    return (
                      <Pressable
                        key={suggestion}
                        onPress={() => setQuery(suggestion)}
                        style={({ pressed }) => [
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.surfaceElevated,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.borderSubtle,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? colors.primaryForeground
                                : colors.text,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {suggestion}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Subtítulo de Resultados */}
            <View style={styles.resultsHeaderRow}>
              <View style={styles.resultsBadgeRow}>
                {query ? (
                  <Search size={12} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <History size={12} color={colors.textSecondary} strokeWidth={2} />
                )}
                <Text style={[styles.resultsHeaderLabel, { color: colors.textSecondary }]}>
                  {query
                    ? `${filteredTransactions.length} MOVIMENTAÇ${filteredTransactions.length === 1 ? 'ÃO ENCONTRADA' : 'ÕES ENCONTRADAS'}`
                    : 'ÚLTIMAS MOVIMENTAÇÕES'}
                </Text>
              </View>
            </View>

            {/* Lista de Resultados */}
            <FlatList
              data={filteredTransactions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TransactionItem
                  transaction={item}
                  onPress={() => handleSelect(item)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <Search size={24} color={colors.textSecondary} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Nenhuma transação encontrada
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Não encontramos nenhuma movimentação com o termo "{query}". Tente buscar por outra palavra.
                  </Text>
                </View>
              }
            />
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 24,
  },
  sheetSafeContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerPreTitle: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.bold,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.2,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: Typography.medium,
  },
  clearButton: {
    padding: 4,
  },
  chipsSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },
  chipsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipsLabel: {
    fontSize: 9.5,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: Typography.medium,
  },
  resultsHeaderRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultsHeaderLabel: {
    fontSize: 10,
    fontFamily: Typography.bold,
    letterSpacing: 0.8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
});
