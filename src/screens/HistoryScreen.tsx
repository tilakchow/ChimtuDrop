import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Header } from '../components/common/Header';
import { HistoryItemCard } from '../components/history/HistoryItemCard';
import { DownloadItem } from '../types/download';
import { historyStorage } from '../services/storage/historyStorage';
import { shareDownloadedFile } from '../utils/shareUtils';

interface HistoryScreenProps {
  onBack: () => void;
  onSelectItem?: (item: DownloadItem) => void;
}

type FilterType = 'all' | 'video' | 'image';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack, onSelectItem }) => {
  const { colors, typography, spacing, borderRadius, isDark } = useTheme();

  const [history, setHistory] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const verified = await historyStorage.verifyAndSync();
        if (isMounted) {
          setHistory(verified);
        }
      } catch (err) {
        console.warn('Error loading history:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleShare = async (item: DownloadItem) => {
    const success = await shareDownloadedFile(item.fileUri);
    if (!success) {
      Alert.alert('Notice', 'Unable to share this file. It may have been moved or removed.');
    }
  };

  const handleDelete = (item: DownloadItem) => {
    Alert.alert('Delete File', `Are you sure you want to delete "${item.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await historyStorage.deleteHistoryItem(item.id);
          setHistory((prev) => prev.filter((h) => h.id !== item.id));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (history.length === 0) return;
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all download records and local files?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await historyStorage.clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const filteredHistory = history.filter((item) => {
    // Filter by type
    if (activeFilter !== 'all' && item.mediaType !== activeFilter) {
      return false;
    }
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.fileName.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      return matchName || matchTitle;
    }
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Download History"
        showBack
        onBack={onBack}
        rightAction={
          history.length > 0 ? (
            <Pressable onPress={handleClearAll} hitSlop={8}>
              <Text style={[typography.captionBold, { color: colors.error }]}>Clear All</Text>
            </Pressable>
          ) : null
        }
      />

      <View style={[styles.container, { paddingHorizontal: spacing.lg }]}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(108,92,231,0.1)',
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search downloads by name..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, typography.body, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['all', 'video', 'image'] as FilterType[]).map((filter) => {
            const isSelected = activeFilter === filter;
            const label = filter === 'all' ? 'All' : filter === 'video' ? 'Videos' : 'Photos';
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                    borderRadius: borderRadius.pill,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content / List */}
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Ionicons name="folder-open-outline" size={38} color={colors.textMuted} />
            </View>
            <Text style={[typography.title2, { color: colors.text, marginTop: spacing.md }]}>
              {searchQuery ? 'No matching downloads' : 'No downloads yet'}
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 260 },
              ]}
            >
              {searchQuery
                ? 'Try a different search keyword or filter.'
                : 'Media you download will appear here for offline access and sharing.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <HistoryItemCard
                item={item}
                onShare={handleShare}
                onDelete={handleDelete}
                onPress={onSelectItem}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.huge, paddingTop: spacing.xs }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
