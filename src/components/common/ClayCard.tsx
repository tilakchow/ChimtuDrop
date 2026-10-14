import React from 'react';
import { View, ViewStyle, Pressable, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ClayCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  level?: 'soft' | 'medium' | 'floating' | 'inset';
  padding?: number;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  children,
  style,
  onPress,
  level = 'medium',
  padding,
}) => {
  const { colors, borderRadius, spacing, getClayShadow } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: level === 'inset' ? colors.inset : colors.card,
    borderRadius: borderRadius.lg,
    padding: padding !== undefined ? padding : spacing.lg,
    ...getClayShadow(level),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          pressed && {
            transform: [{ scale: 0.985 }],
            opacity: 0.94,
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
};
