/**
 * SectionTitle
 * MMDL display — section eyebrow + title + optional trailing action.
 */

import React, { memo } from "react";
import { View, Text, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useThemeTokens } from "@/src/mobile/design-system";

interface SectionTitleProps {
  title:        string;
  eyebrow?:     string;
  actionLabel?: string;
  onAction?:    () => void;
  style?:       StyleProp<ViewStyle>;
  testID?:      string;
}

export const SectionTitle = memo<SectionTitleProps>(function SectionTitle({
  title,
  eyebrow,
  actionLabel,
  onAction,
  style,
  testID,
}) {
  const { colors, type, sp } = useThemeTokens();

  return (
    <View
      testID={testID}
      style={[
        {
          gap:           eyebrow ? sp[1] : 0,
          marginBottom:  sp[3],
        },
        style,
      ]}
    >
      {eyebrow && (
        <Text style={[type.overline, { color: colors.accentGold }]}>
          {eyebrow.toUpperCase()}
        </Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[type.subtitle, { color: colors.textPrimary, flex: 1 }]}>
          {title}
        </Text>
        {actionLabel && onAction && (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={8}
          >
            <Text style={[type.label, { color: colors.primary, fontSize: 13 }]}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});
