import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { QualityOption } from '../../types/media';

interface QualityPickerProps {
  qualities: QualityOption[];
  selectedQualityId?: string;
  onSelectQuality: (quality: QualityOption) => void;
}

export const QualityPicker: React.FC<QualityPickerProps> = ({
  qualities,
  selectedQualityId,
  onSelectQuality,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  if (!qualities || qualities.length <= 1) {
    return null;
  }

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[typography.headline, { color: colors.text, marginBottom: spacing.sm }]}>
        Select Quality / Format
      </Text>
      <View style={styles.list}>
        {qualities.map((q) => {
          const isSelected = q.id === selectedQualityId || (!selectedQualityId && q === qualities[0]);
          return (
            <Pressable
              key={q.id}
              onPress={() => onSelectQuality(q)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                  borderRadius: borderRadius.md,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={isSelected ? '#FFF' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  typography.captionBold,
                  { color: isSelected ? '#FFF' : colors.text },
                ]}
              >
                {q.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
});
