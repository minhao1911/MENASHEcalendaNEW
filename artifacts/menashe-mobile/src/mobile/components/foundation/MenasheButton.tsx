/**
 * MenasheButton
 * MMDL foundation — primary interactive button.
 *
 * Variants: primary · secondary · ghost · danger · gold-outline
 * Sizes:    sm · md · lg
 */

import React, { memo } from "react";
import {
  Pressable, Text, ActivityIndicator, View,
  type StyleProp, type ViewStyle, type TextStyle,
} from "react-native";
import { useThemeTokens } from "@/src/mobile/design-system";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold-outline";
export type ButtonSize    = "sm" | "md" | "lg";

interface MenasheButtonProps {
  variant?:            ButtonVariant;
  size?:               ButtonSize;
  label:               string;
  onPress?:            () => void;
  disabled?:           boolean;
  loading?:            boolean;
  /** Feather icon name to display before label */
  leadingIcon?:        string;
  style?:              StyleProp<ViewStyle>;
  labelStyle?:         StyleProp<TextStyle>;
  testID?:             string;
  accessibilityLabel?: string;
  fullWidth?:          boolean;
}

const SIZE_H  = { sm: 36, md: 44, lg: 52 } as const;
const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;

export const MenasheButton = memo<MenasheButtonProps>(function MenasheButton({
  variant = "primary",
  size    = "md",
  label,
  onPress,
  disabled = false,
  loading  = false,
  style,
  labelStyle,
  testID,
  accessibilityLabel,
  fullWidth = false,
}) {
  const { colors, type, rd } = useThemeTokens();

  const bg =
    variant === "primary"      ? colors.primary :
    variant === "secondary"    ? colors.secondary :
    variant === "danger"       ? colors.error :
    "transparent";

  const textColor =
    variant === "primary"      ? colors.primaryForeground :
    variant === "secondary"    ? colors.secondaryForeground :
    variant === "ghost"        ? colors.primary :
    variant === "danger"       ? "#ffffff" :
    variant === "gold-outline" ? colors.accentGold :
    colors.primary;

  const borderColor =
    variant === "gold-outline" ? colors.accentGold :
    variant === "ghost"        ? "transparent" :
    "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        {
          backgroundColor:    bg,
          borderRadius:       rd.md,
          borderWidth:        variant === "gold-outline" || variant === "ghost" ? 1 : 0,
          borderColor,
          height:             SIZE_H[size],
          paddingHorizontal:  SIZE_PX[size],
          alignItems:         "center" as const,
          justifyContent:     "center" as const,
          flexDirection:      "row" as const,
          gap:                8,
          opacity:            disabled ? 0.5 : pressed ? 0.85 : 1,
          transform:          [{ scale: pressed && !disabled ? 0.97 : 1 }],
          alignSelf:          fullWidth ? "stretch" as const : "flex-start" as const,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text
          style={[type.label, { color: textColor, letterSpacing: 0.3 }, labelStyle]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
});

// Convenience alias
export const colors = {};
