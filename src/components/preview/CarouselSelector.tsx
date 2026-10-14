import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { MediaItem } from '../../types/media';

interface CarouselSelectorProps {
  items: MediaItem[];
  selectedIndices: number[];
  onToggleIndex: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const CarouselSelector: React.FC<CarouselSelectorProps> = ({
  items,
  selectedIndices,
  onToggleIndex,
  onSelectAll,
  onDeselectAll,
}) => {
  const { colors, typography, spacing, borderRadius, isDark } = useTheme();

  const allSelected = selectedIndices.length === items.length;

  return (
    <View style={{ marginTop: spacing.md }}>
      <View style={styles.headerRow}>
        <Text style={[typography.headline, { color: colors.text }]}>
          Carousel Items ({selectedIndices.length}/{items.length} selected)
        </Text>
        <Pressable
          onPress={allSelected ? onDeselectAll : onSelectAll}
          hitSlop={8}
        >
          <Text style={[typography.captionBold, { color: colors.primary }]}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: spacing.sm, paddingRight: spacing.md }}
      >
        {items.map((item, index) => {
          const isSelected = selectedIndices.includes(index);
          return (
            <Pressable
              key={item.id || index}
              onPress={() => onToggleIndex(index)}
              style={({ pressed }) => [
                styles.itemCard,
                {
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.cardSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  marginRight: spacing.sm,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              {item.thumbnailUrl || item.type === 'image' ? (
                <Image
                  source={{ uri: item.thumbnailUrl || item.url }}
                  style={[styles.thumbnail, { borderRadius: borderRadius.sm }]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.thumbnail,
                    styles.placeholder,
                    { backgroundColor: colors.inset, borderRadius: borderRadius.sm },
                  ]}
                >
                  <Ionicons name="videocam" size={24} color={colors.primary} />
                </View>
              )}

              {/* Selection Checkbox Overlay */}
              <View
                style={[
                  styles.checkBadge,
                  {
                    backgroundColor: isSelected ? colors.primary : 'rgba(0,0,0,0.4)',
                    borderColor: '#FFFFFF',
                  },
                ]}
              >
                {isSelected ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
              </View>

              {/* Item index & type badge */}
              <View style={[styles.bottomInfo, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)' }]}>
                <Ionicons
                  name={item.type === 'video' ? 'videocam' : 'image'}
                  size={10}
                  color="#FFF"
                  style={{ marginRight: 3 }}
                />
                <Text style={[typography.captionBold, { color: '#FFF', fontSize: 10 }]}>
                  #{index + 1}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemCard: {
    width: 90,
    height: 110,
    padding: 4,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
