import { AppAlertProvider } from "./AppAlert";
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
    React.createElement(ThemeProvider, null, React.createElement(React.Fragment, null, React.createElement(App), React.createElement(AppAlertProvider))),
  ),
);
