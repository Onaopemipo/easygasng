import React, { useEffect, useId, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useTheme } from "./theme";
import {
  loaderDesign,
  loaderDimension,
  loaderGeometry,
  loaderProgress,
  type LoaderSize,
  type LoaderMode,
  type LoaderVariant,
} from "../../packages/business-rules/src/loader-design";
export type EasyGasLoaderProps = {
  size?: LoaderSize | number;
  mode?: LoaderMode;
  progress?: number;
  variant?: LoaderVariant;
  label?: string;
  accessibilityLabel?: string;
  testID?: string;
  animationDisabled?: boolean;
  operationId?: string;
  visible?: boolean;
  color?: string;
  style?: any;
};
export function EasyGasLoader({
  size = "md",
  mode: requestedMode = "indeterminate",
  progress,
  variant = "inline",
  label = "Loading",
  accessibilityLabel,
  testID,
  animationDisabled = false,
  operationId = "current",
  visible = true,
  style,
}: EasyGasLoaderProps) {
  const mode = requestedMode === "determinate" && typeof progress === "number" && Number.isFinite(progress) ? "determinate" : "indeterminate";
  const { dark, colors } = useTheme();
  const palette = dark ? loaderDesign.dark : loaderDesign.light;
  const dimension = loaderDimension(size),
    id = "eg" + useId().replace(/\W/g, "");
  const rotation = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const saved = useRef({ operationId, progress: 0 });
  if (saved.current.operationId !== operationId)
    saved.current = { operationId, progress: 0 };
  const value =
    mode === "determinate"
      ? loaderProgress(progress, saved.current.progress)
      : 0.2;
  if (mode === "determinate") saved.current.progress = value;
  const geometry = loaderGeometry(value);
  const legacy = process.env.EXPO_PUBLIC_EASYGAS_BRANDED_LOADER === "false";
  useEffect(() => {
    let live = true,
      changed = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (live && !changed) setReduced(v);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        changed = true;
        setReduced(v);
      },
    );
    const state = AppState.addEventListener("change", (v) =>
      setActive(v === "active"),
    );
    return () => {
      live = false;
      motion.remove();
      state.remove();
    };
  }, []);
  useEffect(() => {
    rotation.setValue(0);
    if (
      legacy ||
      reduced ||
      !active ||
      !visible ||
      animationDisabled ||
      mode !== "indeterminate"
    )
      return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: loaderDesign.duration,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      rotation.stopAnimation();
    };
  }, [legacy, reduced, active, visible, animationDisabled, mode, rotation]);
  if (legacy)
    return (
      <ActivityIndicator
        accessibilityLabel={accessibilityLabel ?? label}
        style={style}
        color={colors.primary}
      />
    );
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: true }}
      accessibilityValue={
        mode === "determinate"
          ? { min: 0, max: 100, now: Math.round(value * 100) }
          : undefined
      }
      testID={testID}
      style={[
        variant !== "inline" && styles.section,
        variant === "fullscreen" && {
          flex: 1,
          backgroundColor: colors.background,
        },
        variant === "overlay" && [
          styles.fill,
          { backgroundColor: colors.overlay, zIndex: 20 },
        ],
        style,
      ]}
    >
      <View
        style={{ width: dimension, height: dimension }}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={dimension} height={dimension} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={id + "halo"}>
              <Stop stopColor={palette.halo} stopOpacity={0.4} />
              <Stop offset="1" stopColor={palette.halo} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={id + "flame"} x2="0" y2="1">
              <Stop stopColor={palette.orange} />
              <Stop offset="1" stopColor="#ff9600" />
            </LinearGradient>
          </Defs>
          <Circle cx={50} cy={50} r={45} fill={`url(#${id}halo)`} />
          <Circle
            cx={50}
            cy={50}
            r={43}
            fill="none"
            stroke={palette.track}
            strokeWidth={4}
          />
          <Circle cx={50} cy={51} r={27} fill={palette.halo} opacity={0.18} />
          <Circle cx={50} cy={50} r={26} fill={palette.disc} />
          <Path d={loaderDesign.flame} fill={`url(#${id}flame)`} />
        </Svg>
        <Animated.View
          style={[
            styles.fill,
            {
              transform: [
                {
                  rotate: rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={dimension} height={dimension} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id={id + "arc"}>
                <Stop stopColor={palette.active} />
                <Stop offset="1" stopColor={palette.end} />
              </LinearGradient>
              <RadialGradient id={id + "end"}>
                <Stop stopColor={palette.halo} stopOpacity={0.7} />
                <Stop offset="1" stopColor={palette.halo} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={50}
              cy={50}
              r={43}
              fill="none"
              stroke={`url(#${id}arc)`}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={[geometry.dash, geometry.circumference]}
              rotation={-90}
              origin="50,50"
              opacity={value === 0 ? 0 : 1}
            />
            {value > 0 && (
              <>
                <Circle
                  cx={geometry.x}
                  cy={geometry.y}
                  r={7}
                  fill={`url(#${id}end)`}
                />
                <Circle
                  cx={geometry.x}
                  cy={geometry.y}
                  r={3.5}
                  fill={palette.disc}
                  stroke={palette.end}
                  strokeWidth={0.7}
                />
              </>
            )}
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  section: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    minHeight: 96,
  },
});
