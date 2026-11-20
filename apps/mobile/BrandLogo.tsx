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
  return (
    <Image
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
          tintColor: inverse ? "#ffffff" : undefined,
        },
      ]}
    />
  );
}
