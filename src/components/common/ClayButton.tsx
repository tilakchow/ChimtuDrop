import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ClayButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { colors, borderRadius, spacing, typography, isDark } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return isDark ? '#2D2A38' : '#E2DDEB';
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surfaceRaised;
      case 'danger':
        return colors.error;
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? '#6B667C' : '#9E98AD';
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.text;
      case 'danger':
        return '#FFFFFF';
      case 'ghost':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getPaddingVertical = () => {
    switch (size) {
      case 'sm':
        return spacing.xs + 2;
      case 'lg':
        return spacing.md + 4;
      case 'md':
      default:
        return spacing.md;
    }
  };

  const getPaddingHorizontal = () => {
    switch (size) {
      case 'sm':
        return spacing.md;
      case 'lg':
        return spacing.xl;
      case 'md':
      default:
        return spacing.lg;
    }
  };

  const getShadow = () => {
    if (variant === 'ghost' || disabled) return {};
    return {
      shadowColor: variant === 'primary' ? colors.primaryDark : (isDark ? '#000000' : '#4C3B71'),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.16,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.4)',
    };
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: getBackgroundColor(),
          paddingVertical: getPaddingVertical(),
          paddingHorizontal: getPaddingHorizontal(),
          borderRadius: borderRadius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.6 : 1,
          ...getShadow(),
        },
        pressed &&
          !disabled && {
            transform: [{ scale: 0.97 }],
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon && iconPosition === 'left' && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
          <Text
            style={[
              size === 'sm' ? typography.buttonSm : typography.button,
              {
                color: getTextColor(),
                fontSize: size === 'sm' ? 12 : size === 'lg' ? 15 : 14,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={{ marginLeft: spacing.sm }}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
};
