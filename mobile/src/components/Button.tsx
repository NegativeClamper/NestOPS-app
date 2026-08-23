import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  style,
  disabled,
  ...props
}) => {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style as ViewStyle,
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.white : Colors.primary}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: BorderRadius.md,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },

  // Variants
  primary: { backgroundColor: Colors.primary },
  secondary: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent' },

  // Sizes
  size_sm: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2 },
  size_md: { paddingHorizontal: Spacing[5], paddingVertical: Spacing[3] },
  size_lg: { paddingHorizontal: Spacing[6], paddingVertical: Spacing[4] },

  // Text base
  text: {
    fontWeight: Typography.fontWeight.semibold,
  },
  text_primary: { color: Colors.white },
  text_secondary: { color: Colors.textPrimary },
  text_danger: { color: Colors.white },
  text_ghost: { color: Colors.primary },

  // Text sizes
  textSize_sm: { fontSize: Typography.fontSize.sm },
  textSize_md: { fontSize: Typography.fontSize.base },
  textSize_lg: { fontSize: Typography.fontSize.lg },
});
