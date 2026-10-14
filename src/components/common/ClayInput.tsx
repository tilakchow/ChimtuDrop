import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../theme/ThemeContext';

interface ClayInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onPaste?: () => void;
  onClear?: () => void;
  error?: string;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
}

export const ClayInput: React.FC<ClayInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Paste Instagram or X link...',
  onPaste,
  onClear,
  error,
  style,
  editable = true,
}) => {
  const { colors, borderRadius, spacing, typography, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        onChangeText(text.trim());
        onPaste?.();
      }
    } catch {
      // Ignore
    }
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={style}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.inset,
            borderRadius: borderRadius.lg,
            borderColor: error
              ? colors.error
              : isFocused
              ? colors.primary
              : isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(108, 92, 231, 0.12)',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <Ionicons
          name="link-outline"
          size={20}
          color={isFocused ? colors.primary : colors.textMuted}
          style={{ marginRight: spacing.sm }}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            typography.body,
            {
              color: colors.text,
            },
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus
        />

        {value.length > 0 ? (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: isDark ? '#2E2B3A' : '#DDD7EB' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePaste}
            hitSlop={8}
            style={({ pressed }) => [
              styles.pasteChip,
              {
                backgroundColor: isDark ? '#2E2B3A' : '#EDE8F5',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(108, 92, 231, 0.15)',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="clipboard-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[typography.captionBold, { color: colors.primary }]}>Paste</Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, marginLeft: spacing.xs }}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={[typography.caption, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
});
