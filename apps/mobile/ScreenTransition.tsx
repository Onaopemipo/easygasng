import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";

/** A short visual transition, never an artificial loading delay. */
export function ScreenTransition({
  identity,
  children,
  fill = true,
}: {
  identity: string;
  children: React.ReactNode;
  fill?: boolean;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0.55);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => {
      animation.stop();
      opacity.setValue(1);
    };
  }, [identity, reduced, opacity]);
  return (
    <Animated.View
      style={{ flex: fill ? 1 : undefined, width: "100%", opacity }}
    >
      {children}
    </Animated.View>
  );
}
