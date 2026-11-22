import { ModalAlertHost, dismissPresentedDialog } from "./NativeDialog";
import React from "react";
import {
  Modal as NativeModal,
  View,
  StyleSheet,
  type ModalProps,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
  type SafeAreaViewProps,
} from "react-native-safe-area-context";
import { useTheme } from "./theme";

/** The canvas paints the whole window; safe-area padding belongs to its content. */
export function ScreenCanvas({
  children,
  style,
  topBackgroundColor,
  bottomBackgroundColor,
  ...props
}: SafeAreaViewProps & {
  topBackgroundColor?: string;
  bottomBackgroundColor?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[{ backgroundColor: colors.background }, style, styles.canvas]}
    >
      <SafeAreaView {...props} style={styles.content}>
        {children}
      </SafeAreaView>
      {topBackgroundColor && (
        <View
          pointerEvents="none"
          style={[
            styles.topEdge,
            { height: insets.top, backgroundColor: topBackgroundColor },
          ]}
        />
      )}
      {bottomBackgroundColor && (
        <View
          pointerEvents="none"
          style={[
            styles.bottomEdge,
            { height: insets.bottom, backgroundColor: bottomBackgroundColor },
          ]}
        />
      )}
    </View>
  );
}

/** Screen-sized forms and modal backdrops share the same full-window presentation. */
export function ScreenModal({
  transparent,
  children,
  onRequestClose,
  ...props
}: ModalProps) {
  return (
    <NativeModal
      {...props}
      transparent={transparent}
      presentationStyle={transparent ? "overFullScreen" : "fullScreen"}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={(event) => {
        if (!dismissPresentedDialog()) onRequestClose?.(event);
      }}
    >
      <ModalAlertHost visible={props.visible === true}>
        {children}
      </ModalAlertHost>
    </NativeModal>
  );
}

export const fullWidthScreenContent = {
  width: "100%" as const,
  alignSelf: "stretch" as const,
  flexGrow: 1,
};
const styles = StyleSheet.create({
  canvas: { flex: 1, width: "100%", maxWidth: "100%", alignSelf: "stretch" },
  content: { flex: 1, width: "100%" },
  topEdge: { position: "absolute", top: 0, left: 0, right: 0 },
  bottomEdge: { position: "absolute", bottom: 0, left: 0, right: 0 },
});
