import React from "react";
import { Image, type ImageProps } from "react-native";
import { useTheme } from "./theme";

// Reuse the approved transparent artwork; no opaque logo tile or alternate crop.
export const transparentLogo = require("./assets/easygas-logo-hd.png");
export type BrandLogoProps = Pick<
  ImageProps,
  "style" | "accessible" | "accessibilityLabel" | "testID"
> & {
  width?: number;
  height?: number;
  tone?: "auto" | "brand" | "inverse";
};
export default function BrandLogo({
  width = 151,
  height = 50,
  tone = "auto",
  accessible = true,
  accessibilityLabel = "EasyGas Energy Solutions",
  style,
  testID,
}: BrandLogoProps) {
  const { dark } = useTheme();
  const inverse = tone === "inverse" || (tone === "auto" && dark);
  // iOS can retain template rendering after clearing a tint. A new image view
  // restores the original artwork when switching back to the brand variant.
  return (
    <Image
      key={inverse ? "inverse" : "brand"}
      source={transparentLogo}
      resizeMode="contain"
      accessible={accessible}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        { width, height },
        style,
        {
          backgroundColor: "transparent",
        },
        inverse ? { tintColor: "#ffffff" } : {},
      ]}
    />
  );
}
