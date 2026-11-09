import "./driver-location";
import { registerRootComponent } from "expo";
import App from "./App";
import { ThemeProvider } from "./theme";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
registerRootComponent(() =>
  React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(ThemeProvider, null, React.createElement(App)),
  ),
);
