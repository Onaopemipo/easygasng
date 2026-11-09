import { stopDriverLocation } from "./driver-location";
import { NativePaymentReturn } from "./HostedPayment";
import TechnicianWorkspace from "./TechnicianWorkspace";
import TechnicianSignIn from "./TechnicianSignIn";
import DriverWorkspace from "./DriverWorkspace";
import DriverSignIn from "./DriverSignIn";
import { ScreenTitleContext } from "./CustomerUI";
import { customerMobileLink } from "../../packages/business-rules/src/customer-mobile";
import CustomerWallet from "./CustomerWallet";
import TrackingSummary from "./TrackingSummary";
import Cylinders from "./Cylinders";
import CustomerNotifications from "./CustomerNotifications";
import AccountHub from "./AccountHub";
import Invoices from "./Invoices";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme";
import CustomerHome from "./CustomerHome";
import Constants from "expo-constants";
import { assertMobileApiOrigin } from "../../packages/business-rules/src/mobile-origin";
import OrderVisit from "./OrderVisit";
import { DriverPhoto } from "./DriverPhoto";
import DriverOperations from "./DriverOperations";
import {
  NativeEasyRewards,
  NativePartialRefund,
  NativeSmartOffers,
  NativeRewardSelector,
} from "./EasyRewards";
import { deliveryFailureReasons } from "../../packages/business-rules/src/order-tracking";
import { randomUUID } from "expo-crypto";
import GasOrder from "./GasOrder";
import CombinedCheckout from "./CombinedCheckout";
import Onboarding from "./Onboarding";
import Services from "./Services";
import {
  loadQueue,
  saveQueue,
  enqueueDelivery,
  type PendingDelivery,
} from "./offline";
import Workflows, { NativeForm } from "./Workflows";
import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  StatusBar,
  BackHandler,
} from "react-native";
import { View, ScrollView, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
const origin = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3003";
const currency = (n: number | string | null) =>
  n === null ? "Pricing soon" : `₦${(Number(n) / 100).toLocaleString("en-NG")}`;
type Item = { productId: string; quantity: number };
export default function App() {
  const { dark, colors, preference, setPreference } = useTheme();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [introReplay, setIntroReplay] = useState(0);
  const technicianShell = Constants.expoConfig?.extra?.technicianOnly === true;
  const driverShell = Constants.expoConfig?.extra?.driverOnly === true;
  const [driverRecover, setDriverRecover] = useState(false);
  const [phoneLogin, setPhoneLogin] = useState(false);
  const [token, setToken] = useState<string | null>(null),
    [user, setUser] = useState<any>(null),
    [catalogue, setCatalogue] = useState<any>(null),
    [screen, setScreen] = useState("home"),
    [cart, setCart] = useState<Item[]>([]),
    [hydrated, setHydrated] = useState(false),
    [orders, setOrders] = useState<any[]>([]),
    [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]),
    [syncing, setSyncing] = useState(false),
    [wallet, setWallet] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [register, setRegister] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [detail, setDetail] = useState<any>(null),
    [address, setAddress] = useState({
      name: "",
      phone: "",
      street: "",
      zone: "",
    }),
    [paymentMethod, setPaymentMethod] = useState("cash_on_delivery"),
    [rewardPoints, setRewardPoints] = useState(""),
    [rewardOfferId, setRewardOfferId] = useState(""),
    [orderFilter, setOrderFilter] = useState<string | null>(null),
    [date, setDate] = useState(""),
    [window, setWindow] = useState(""),
    [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [screen, user?.id]);
  const navHistory = useRef<string[]>(["home"]);
  const pendingLink = useRef<{ screen: string; id?: string } | null>(null);
  const initialLink = useRef(false);
  useEffect(() => {
    const history = navHistory.current;
    if (history.at(-1) !== screen) {
      if (screen === "home") navHistory.current = ["home"];
      else history.push(screen);
    }
  }, [screen]);
  function back() {
    if (navHistory.current.length < 2) return false;
    navHistory.current.pop();
    setScreen(navHistory.current.at(-1) ?? "home");
    return true;
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      back,
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const handle = (url: string) => {
      const dest = customerMobileLink(url);
      if (!dest) return;
      if (user && !["customer", "commercial"].includes(user.role)) {
        setError(
          "This link is for customer accounts. Your staff workspace has been preserved.",
        );
        return;
      }
      if (!user) {
        pendingLink.current = dest;
        setScreen("login");
        return;
      }
      setOrderFilter(dest.id ?? null);
      setScreen(dest.screen);
    };
    if (!initialLink.current) {
      initialLink.current = true;
      Linking.getInitialURL()
        .then((url) => {
          if (url) handle(url);
        })
        .catch(() => {});
    }
    const listener = Linking.addEventListener("url", (event) =>
      handle(event.url),
    );
    return () => listener.remove();
  }, [hydrated, user?.id]);
  const trackingOperations = useRef(new Map<string, string>());
  function trackingKey(action: string, o: any) {
    const identity = `${action}:${o.id}:${o.tracking_version}`;
    if (!trackingOperations.current.has(identity))
      trackingOperations.current.set(identity, randomUUID());
    return trackingOperations.current.get(identity)!;
  }
  const accountRef = useRef<string | null>(null);
  accountRef.current = user?.id ?? null;
  function navigateCustomer(destination: string) {
    if (
      !user &&
      ![
        "home",
        "gas-order",
        "services",
        "products",
        "cart",
        "detail",
        "appearance",
        "recovery",
        "login",
      ].includes(destination)
    ) {
      pendingLink.current = { screen: destination };
      setScreen("login");
      return;
    }
    setScreen(destination);
  }
  function clearPrivateState() {
    navHistory.current = ["home"];
    trackingOperations.current.clear();
    setOrders([]);
    setOrderFilter(null);
    setPendingDeliveries([]);
    setWallet(null);
    setRewardPoints("");
    setRewardOfferId("");
    setAddress({ name: "", phone: "", street: "", zone: "" });
    setDate("");
    setWindow("");
    setPaymentMethod("cash_on_delivery");
    setKey(null);
    setPassword("");
  }
  async function api(action: string, data?: any, session = token) {
    if (action === "checkout" && data) data = { ...data, source: "MOBILE" };
    if (action === "checkout.mixed" && data?.products)
      data = { ...data, products: { ...data.products, source: "MOBILE" } };
    assertMobileApiOrigin(
      origin,
      __DEV__,
      Constants.expoConfig?.extra?.easygasRuntime === "local-demo",
    );
    const response = await fetch(`${origin}/api/${action}`, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-easygas-client": "native",
        ...(session ? { Authorization: `Bearer ${session}` } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 401 && session) {
        await SecureStore.deleteItemAsync("easygas.session");
        setToken(null);
        setUser(null);
        clearPrivateState();
        setScreen("login");
      }
      throw Object.assign(new Error(body.error ?? "Please try again."), {
        status: response.status,
      });
    }
    if (body.signedOut) {
      await SecureStore.deleteItemAsync("easygas.session");
      setToken(null);
      setUser(null);
      clearPrivateState();
      setScreen("login");
    }
    return body;
  }
  useEffect(() => {
    (async () => {
      try {
        const savedCart = JSON.parse(
          (await SecureStore.getItemAsync("easygas.cart")) ?? "[]",
        );
        if (Array.isArray(savedCart))
          setCart(
            savedCart
              .filter(
                (i) =>
                  typeof i.productId === "string" &&
                  Number.isInteger(i.quantity) &&
                  i.quantity > 0 &&
                  i.quantity <= 20,
              )
              .slice(0, 30),
          );
        const c = await api("catalogue", undefined, null);
        setCatalogue(c);
        const saved = await SecureStore.getItemAsync("easygas.session");
        if (saved) {
          setToken(saved);
          const me = await api("me", undefined, saved);
          setUser(me.user);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setHydrated(true);
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (hydrated)
      SecureStore.setItemAsync("easygas.cart", JSON.stringify(cart)).catch(() =>
        setError("Your cart could not be saved on this device."),
      );
  }, [cart, hydrated]);
  useEffect(() => {
    let active = true;
    setError("");
    if (user && ["orders", "wallet", "rewards", "checkout"].includes(screen)) {
      setLoading(true);
      api(
        screen === "orders"
          ? orderFilter
            ? "orders?id=" + encodeURIComponent(orderFilter)
            : "orders"
          : "wallet",
      )
        .then((d) => {
          if (active) {
            screen === "orders" ? setOrders(d) : setWallet(d);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else setLoading(false);
    return () => {
      active = false;
    };
  }, [screen, user, orderFilter]);
  useEffect(() => {
    let active = true;
    setPendingDeliveries([]);
    if (user?.role === "driver")
      loadQueue(user.id)
        .then((q) => {
          if (active) setPendingDeliveries(q);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user || screen !== "orders") return;
    let active = true;
    const timer = setInterval(() => {
      api(
        orderFilter ? "orders?id=" + encodeURIComponent(orderFilter) : "orders",
      )
        .then((next) => {
          if (active) setOrders(next);
        })
        .catch(() => {
          if (active)
            setError(
              "Offline or tracking unavailable. Displayed order status may be stale.",
            );
        });
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id, screen, orderFilter]);
  async function syncDeliveries() {
    if (!user || syncing) return;
    setSyncing(true);
    const uid = user.id;
    try {
      let queue = await loadQueue(uid);
      for (const event of [...queue]) {
        try {
          await api("delivery.complete", {
            orderId: event.orderId,
            version: event.version,
            handover: event.handover,
            operationKey: event.operationKey ?? event.id,
            code: event.code,
            collectedKobo: event.collectedKobo,
          });
          queue = queue.filter((q) => q.id !== event.id);
        } catch (e: any) {
          if (!e.status || e.status === 401) throw e;
          queue = queue.map((q) =>
            q.id === event.id ? { ...q, error: e.message } : q,
          );
        }
        await saveQueue(uid, queue);
      }
      const currentOrders = await api("orders");
      if (accountRef.current === uid) {
        setPendingDeliveries(queue);
        setOrders(currentOrders);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }
  async function login() {
    setLoading(true);
    setError("");
    try {
      const result = await api(
        technicianShell
          ? "technician.login"
          : driverShell
            ? "driver.login"
            : register
              ? "register"
              : phoneLogin
                ? "phone.login"
                : "login",
        {
          ...(phoneLogin && !register ? { phone: email } : { email }),
          password,
          ...(register ? { name } : {}),
        },
        null,
      );
      await SecureStore.setItemAsync("easygas.session", result.token);
      clearPrivateState();
      setToken(result.token);
      const me = await api("me", undefined, result.token);
      setUser(me.user);
      setPassword("");
      const destination = pendingLink.current;
      pendingLink.current = null;
      if (destination && ["customer", "commercial"].includes(me.user.role)) {
        setOrderFilter(destination.id ?? null);
        setScreen(destination.screen);
      } else setScreen("home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    await stopDriverLocation();
    pendingLink.current = null;
    try {
      await api("logout", {});
    } finally {
      await SecureStore.deleteItemAsync("easygas.session");
      setToken(null);
      setUser(null);
      clearPrivateState();
      setScreen("home");
    }
  }
  function add(p: any) {
    if (p.category === "Gas refills") {
      setScreen("gas-order");
      return;
    }
    if (!p.published || !p.available || !p.price_kobo) return;
    setCart((items) => {
      const old = items.find((i) => i.productId === p.id);
      return old
        ? items.map((i) =>
            i.productId === p.id
              ? { ...i, quantity: Math.min(20, p.available, i.quantity + 1) }
              : i,
          )
        : [...items, { productId: p.id, quantity: 1 }];
    });
    Alert.alert("Added to your cart", p.name);
  }
  const button = (
    label: string,
    onPress: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.4 }]}
      onPress={onPress}
    >
      <Text style={[s.buttonText, secondary && { color: "#07592e" }]}>
        {label}
      </Text>
    </Pressable>
  );
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    props: any = {},
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={value}
        onChangeText={set}
        placeholderTextColor="#939d90"
        {...props}
      />
    </View>
  );
  const art = (p: any, large = false) => (
    <View style={[s.productArt, large && { height: 280 }]}>
      {p.image_id ? (
        <Image
          source={{ uri: origin + "/api/media/" + p.image_id }}
          accessibilityLabel={p.name}
          style={{ width: large ? 230 : 100, height: large ? 270 : 115 }}
          resizeMode="contain"
        />
      ) : p.asset === "cylinder" ? (
        <Image
          source={require("./assets/cylinder-illustration.png")}
          style={{ width: large ? 230 : 100, height: large ? 270 : 115 }}
          resizeMode="contain"
        />
      ) : (
        <Text style={{ fontSize: large ? 80 : 46 }}>
          {p.asset === "hose" ? "〰" : p.asset === "regulator" ? "◉" : "▣"}
        </Text>
      )}
    </View>
  );
  async function refreshCatalogue() {
    setLoading(true);
    setError("");
    try {
      setCatalogue(await api("catalogue", undefined, null));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  const products = catalogue?.products ?? [],
    driver = user?.role === "driver";
  if (user?.role === "technician")
    return (
      <TechnicianWorkspace
        key={user.id}
        user={user}
        api={api}
        origin={origin}
        token={token}
        logout={logout}
      />
    );
  if (technicianShell)
    return (
      <TechnicianSignIn
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        submit={login}
        busy={loading}
        error={error}
        recover={driverRecover}
        setRecover={setDriverRecover}
        api={api}
        signout={user ? logout : undefined}
      />
    );
  if (user?.role === "driver")
    return (
      <DriverWorkspace
        key={user.id}
        user={user}
        api={api}
        origin={origin}
        token={token}
        logout={logout}
      />
    );
  if (driverShell)
    return (
      <DriverSignIn
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        submit={login}
        busy={loading || !hydrated}
        error={user ? "This app requires a verified driver account." : error}
        recover={driverRecover}
        setRecover={setDriverRecover}
        api={api}
        signout={user ? logout : undefined}
      />
    );
  const customerView = !user || ["customer", "commercial"].includes(user.role);
  const headerTitle: Record<string, string> = {
    "gas-order": "Order Gas",
    checkout: "Checkout",
    orders: orderFilter ? "Track Order" : "Orders",
    services: "Book a Service",
    bookings: "Service Bookings",
    cylinders: "My Cylinders",
    plans: "Refill Plan",
    wallet: "My Wallet",
    invoices: "Invoices & Receipts",
    notifications: "Notifications",
    more: "My Account",
    appearance: "Appearance",
  };
  return (
    <SafeAreaView style={[s.app, { backgroundColor: colors.background }]}>
      <Onboarding replay={introReplay} />
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      {customerView && screen !== "home" && screen !== "login" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            gap: 10,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              if (!back()) setScreen("home");
            }}
            style={{ width: 44, height: 44, justifyContent: "center" }}
          >
            <Ionicons
              accessible={false}
              name="chevron-back"
              size={25}
              color={colors.text}
            />
          </Pressable>
          <Text
            preserveColor
            style={{
              fontSize: 20,
              lineHeight: 27,
              fontWeight: "800",
              color: colors.text,
              flex: 1,
            }}
          >
            {headerTitle[screen] ?? "Your EasyGas"}
          </Text>
        </View>
      )}
      {!customerView &&
        screen !== "login" &&
        !(
          screen === "home" &&
          (!user || ["customer", "commercial"].includes(user.role))
        ) && (
          <View style={s.header}>
            {screen !== "home" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => {
                  if (!back()) setScreen("home");
                }}
                style={{
                  minWidth: 44,
                  minHeight: 48,
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  accessible={false}
                  name="chevron-back"
                  size={25}
                  color={colors.text}
                />
              </Pressable>
            )}
            <View>
              <View
                style={{ width: 151, height: 50 }}
                accessibilityLabel="EasyGas Energy Solutions"
              >
                <Image
                  source={require("./assets/easygas-logo-hd.png")}
                  resizeMode="contain"
                  style={{ width: 151, height: 50 }}
                />
              </View>
              <Text style={s.location}>More Cooking. Less Worry.</Text>
            </View>
            <Pressable onPress={() => setScreen(user ? "more" : "login")}>
              <Text style={s.headerAction}>
                {user ? user.name.split(" ")[0] : "Sign In"}
              </Text>
            </Pressable>
          </View>
        )}
      <ScreenTitleContext.Provider
        value={customerView ? (headerTitle[screen] ?? null) : null}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            s.content,
            customerView && {
              padding: 16,
              width: "100%",
              maxWidth: 780,
              alignSelf: "center",
            },
          ]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
        >
          {error ? (
            <View style={s.notice}>
              <Text style={s.noticeText}>{error}</Text>
              {!catalogue &&
                button("Retry connection", refreshCatalogue, true, loading)}
            </View>
          ) : null}
          {loading || !hydrated ? (
            <ActivityIndicator color="#087a36" style={{ margin: 20 }} />
          ) : null}
          {["gas-order", "combined-checkout", "products", "checkout"].includes(
            screen,
          ) && !catalogue ? (
            <View style={s.notice}>
              <Text style={s.title}>Catalogue unavailable</Text>
              <Text style={s.body}>
                Reconnect and retry to check current prices and availability
                before ordering.
              </Text>
              {button("Retry catalogue", refreshCatalogue, true, loading)}
            </View>
          ) : screen === "gas-order" ? (
            <GasOrder
              onPlaced={() => setCart([])}
              api={api}
              catalogue={catalogue}
              user={user}
              cart={cart}
              done={() => {
                setCart([]);
                setScreen("orders");
              }}
            />
          ) : screen === "combined-checkout" ? (
            <CombinedCheckout
              orderGas={() => setScreen("gas-order")}
              api={api}
              user={user}
              cart={cart}
              catalogue={catalogue}
              done={() => {
                setCart([]);
                setScreen("bookings");
              }}
            />
          ) : screen === "services" || screen === "bookings" ? (
            <Services
              api={api}
              user={user}
              bookingsOnly={screen === "bookings"}
              token={token}
              apiUrl={origin}
              onBundle={(b) =>
                setCart(
                  b.products.map((p: any) => ({
                    productId: p.productId,
                    quantity: p.quantity,
                  })),
                )
              }
              onStage={() => setScreen("combined-checkout")}
            />
          ) : screen === "cylinders" ? (
            user ? (
              <Cylinders key={user.id} api={api} navigate={navigateCustomer} />
            ) : (
              <Text>Sign in to view your cylinders.</Text>
            )
          ) : screen === "notifications" ? (
            user ? (
              <CustomerNotifications
                key={user.id}
                api={api}
                navigate={navigateCustomer}
                onOrder={(id) => {
                  setOrderFilter(id);
                  setScreen("orders");
                }}
              />
            ) : (
              <Text>Sign in to view notifications.</Text>
            )
          ) : [
              "profile",
              "conversations",
              "consumption",
              "credit",
              "plans",
              "recovery",
              "recurring",
              "notifications",
            ].includes(screen) ? (
            <>
              {["consumption", "plans", "recurring"].includes(screen) && (
                <NativeSmartOffers
                  api={api}
                  onOffer={(o) => {
                    setRewardPoints(String(o.points));
                    setRewardOfferId(o.id);
                    setKey(null);
                    setScreen(cart.length ? "checkout" : "products");
                  }}
                />
              )}
              <Workflows
                key={`${user?.id ?? "guest"}:${screen}`}
                screen={screen}
                api={api}
              />
            </>
          ) : screen === "login" ? (
            <>
              <View
                style={{
                  alignItems: "center",
                  marginTop: 35,
                  marginBottom: 25,
                }}
              >
                <Image
                  source={require("./assets/easygas-logo-hd.png")}
                  resizeMode="contain"
                  style={{
                    width: 245,
                    height: 82,
                    backgroundColor: "#fff",
                    borderRadius: 18,
                  }}
                />
              </View>
              <Text style={s.title}>
                {register ? "Make yourself at home." : "Welcome back."}
              </Text>
              <Text style={s.body}>More Cooking. Less Worry.</Text>
              {register &&
                field("Full name", name, setName, { autoComplete: "name" })}
              {!register &&
                button(
                  phoneLogin
                    ? "Use email instead"
                    : "Use activated phone number",
                  () => setPhoneLogin((v) => !v),
                  true,
                )}
              {field(
                phoneLogin && !register
                  ? "Activated phone number"
                  : "Email address",
                email,
                setEmail,
                {
                  autoCapitalize: "none",
                  keyboardType:
                    phoneLogin && !register ? "phone-pad" : "email-address",
                  autoComplete: phoneLogin && !register ? "tel" : "email",
                },
              )}
              {field("Password", password, setPassword, {
                secureTextEntry: true,
                autoComplete: register ? "new-password" : "current-password",
              })}
              {register && (
                <Text style={s.caption}>
                  Use at least 12 characters. No role selection is required.
                </Text>
              )}
              {button(
                register ? "Create Account" : "Sign In",
                login,
                false,
                loading || !hydrated,
              )}
              {button(
                register
                  ? "Already a member? Sign in"
                  : "New to EasyGas? Create an account",
                () => setRegister(!register),
                true,
              )}
              {button("Forgot password?", () => setScreen("recovery"), true)}
            </>
          ) : screen === "payment" ? (
            <NativePaymentReturn api={api} intentId={orderFilter} />
          ) : screen === "invoices" ? (
            user ? (
              <Invoices
                key={user.id}
                api={api}
                origin={origin}
                token={token}
                userId={user.id}
              />
            ) : (
              <Text>Sign in to view your invoices.</Text>
            )
          ) : screen === "appearance" ? (
            <>
              <Text style={s.title}>Appearance</Text>
              <Text style={s.body}>
                This device preference follows you between sessions. System
                follows your device settings.
              </Text>
              {(["light", "dark", "system"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: preference === value }}
                  onPress={() =>
                    setPreference(value).catch(() =>
                      setError("Could not save appearance. Please try again."),
                    )
                  }
                  style={[
                    s.menuItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      minHeight: 56,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text }}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </Text>
                  <Text style={{ color: colors.primary }}>
                    {preference === value ? "●" : "○"}
                  </Text>
                </Pressable>
              ))}
              {button(
                "View introduction",
                () => setIntroReplay((value) => value + 1),
                true,
              )}
            </>
          ) : screen === "home" &&
            (!user || ["customer", "commercial"].includes(user.role)) ? (
            <CustomerHome
              key={user?.id ?? "guest"}
              user={user}
              api={api}
              navigate={navigateCustomer}
            />
          ) : screen === "home" ? (
            <>
              {button("Order cooking gas", () => setScreen("gas-order"))}
              {catalogue?.gas && (
                <Text>
                  {currency(catalogue.gas.priceKobo)}/kg · Flat delivery{" "}
                  {currency(catalogue.gas.deliveryKobo)}
                </Text>
              )}
              {button(
                "Professional Gas Services",
                () => setScreen("services"),
                true,
              )}
              {user &&
                button(
                  user.role === "technician"
                    ? "Assigned Appointments"
                    : "My Service Bookings",
                  () => setScreen("bookings"),
                  true,
                )}
              <Text style={s.greeting}>
                {user ? "Good to see you," : "Good energy starts here."}
              </Text>
              <Text style={s.title}>
                {user
                  ? `${user.name.split(" ")[0]}!`
                  : "More Cooking. Less Worry."}
              </Text>
              {driver ? (
                <>
                  <View style={s.card}>
                    <Text style={s.sectionTitle}>Your deliveries</Text>
                    <Text style={s.body}>
                      View only the orders assigned to you. Delivery events are
                      validated by the same server as the business dashboard.
                    </Text>
                    {button("View Assigned Deliveries", () =>
                      setScreen("orders"),
                    )}
                  </View>
                </>
              ) : (
                <>
                  <View style={s.refillCard}>
                    <Text style={s.sectionTitle}>
                      Find your cooking rhythm.
                    </Text>
                    <Text style={s.body}>
                      Your refill estimate uses verified purchase history. View
                      your cooking profile for its current estimate.
                    </Text>
                    <Text style={s.caption}>
                      Estimates are never sensor measurements.
                    </Text>
                  </View>
                  {button("Order Gas", () => setScreen("gas-order"))}
                  <View style={s.shortcuts}>
                    {[
                      ["Orders", "orders"],
                      ["Wallet", "wallet"],
                      ["Rewards", "rewards"],
                      ["Support", "conversations"],
                    ].map(([title, dest]) => (
                      <Pressable
                        style={s.shortcut}
                        key={dest}
                        onPress={() =>
                          setScreen(
                            user || dest === "appearance" ? dest : "login",
                          )
                        }
                      >
                        <Text style={s.shortcutIcon}>
                          {dest === "orders"
                            ? "▣"
                            : dest === "wallet"
                              ? "▰"
                              : dest === "rewards"
                                ? "✦"
                                : "?"}
                        </Text>
                        <Text style={s.caption}>{title}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={s.planCard}>
                    <Text style={s.sectionTitle}>Plan your refills</Text>
                    <Text style={s.body}>
                      Preferred dates, without automatic charges.
                    </Text>
                    {button(
                      "Manage refill plans",
                      () => setScreen(user ? "plans" : "login"),
                      true,
                    )}
                    {button(
                      "View cooking profiles",
                      () => setScreen(user ? "consumption" : "login"),
                      true,
                    )}
                  </View>
                  <Text style={s.sectionTitle}>Popular Products</Text>
                  <View style={s.productGrid}>
                    {products.slice(0, 3).map((p: any) => (
                      <Pressable
                        style={s.miniProduct}
                        key={p.id}
                        onPress={() => {
                          setDetail(p);
                          setScreen("detail");
                        }}
                      >
                        {art(p)}
                        <Text style={s.productName}>{p.name}</Text>
                        <Text style={s.productPrice}>
                          {currency(p.price_kobo)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </>
          ) : screen === "products" ? (
            <>
              <Text style={s.title}>For your kitchen.</Text>
              {field("Search products", search, setSearch, {
                placeholder: "Search gas and accessories…",
              })}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 15 }}
              >
                {["All", ...(catalogue?.categories ?? [])].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[s.chip, category === c && s.activeChip]}
                  >
                    <Text
                      style={{
                        color: category === c ? "white" : "#667560",
                        fontSize: 15,
                      }}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.productGrid}>
                {products
                  .filter(
                    (p: any) =>
                      (category === "All" || p.category === category) &&
                      p.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((p: any) => (
                    <Pressable
                      style={s.product}
                      key={p.id}
                      onPress={() => {
                        setDetail(p);
                        setScreen("detail");
                      }}
                    >
                      {art(p)}
                      <Text style={s.productName}>{p.name}</Text>
                      <Text style={s.productPrice}>
                        {currency(p.price_kobo)}
                      </Text>
                      <Text style={s.caption}>
                        {p.published && p.available
                          ? "Available"
                          : "Being prepared for sale"}
                      </Text>
                    </Pressable>
                  ))}
              </View>
              <Text style={s.caption}>
                Product visuals are illustrative. Live prices are
                business-approved.
              </Text>
            </>
          ) : screen === "detail" && detail ? (
            <>
              {art(detail, true)}
              <Text style={s.title}>{detail.name}</Text>
              <Text style={s.price}>{currency(detail.price_kobo)}</Text>
              <Text style={s.body}>{detail.description}</Text>
              <Text style={s.body}>SKU: {detail.sku}</Text>
              {detail.attributes?.specifications && (
                <Text style={s.body}>{detail.attributes.specifications}</Text>
              )}
              {detail.attributes?.warranty && (
                <Text style={s.body}>
                  Warranty: {detail.attributes.warranty}
                </Text>
              )}
              {detail.attributes?.installationRequired && (
                <Text style={s.body}>Professional installation required.</Text>
              )}
              {detail.images?.slice(1).map((m: any) => (
                <Image
                  key={m.id}
                  accessibilityLabel={m.alt}
                  source={{ uri: origin + "/api/media/" + m.id }}
                  style={{ width: "100%", height: 200, resizeMode: "contain" }}
                />
              ))}
              <NativeCompatibility api={api} productId={detail.id} />
              {products
                .filter(
                  (v: any) =>
                    (detail.parent_id
                      ? v.parent_id === detail.parent_id ||
                        v.id === detail.parent_id
                      : v.parent_id === detail.id) && v.id !== detail.id,
                )
                .map((v: any) => (
                  <Pressable
                    key={v.id}
                    accessibilityRole="button"
                    onPress={() => setDetail(v)}
                  >
                    <Text style={s.body}>
                      {v.name} · {currency(v.price_kobo)}
                    </Text>
                  </Pressable>
                ))}
              <View style={s.notice}>
                <Text style={s.noticeText}>
                  {detail.published && detail.available
                    ? "Available for delivery."
                    : "Availability is being confirmed."}
                </Text>
              </View>
              {button(
                "Add to Cart",
                () => add(detail),
                false,
                !detail.published || !detail.available || !detail.price_kobo,
              )}
              {button("Back to Products", () => setScreen("products"), true)}
              <Text style={s.sectionTitle}>Care for your kitchen.</Text>
              <Text style={s.body}>{detail.safety}</Text>
            </>
          ) : screen === "cart" ? (
            <>
              <Text style={s.title}>Your next good meal.</Text>
              {cart.length ? (
                cart.map((i) => {
                  const p = products.find((p: any) => p.id === i.productId);
                  return (
                    <View style={s.cartRow} key={i.productId}>
                      {art(p)}
                      <View style={{ flex: 1 }}>
                        <Text style={s.productName}>{p.name}</Text>
                        <Text>
                          {i.quantity} × {currency(p.price_kobo)}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setCart(
                              cart.filter((c) => c.productId !== i.productId),
                            )
                          }
                        >
                          <Text style={s.remove}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={s.card}>
                  <Text style={s.body}>
                    Your cart is empty. Explore products to get started.
                  </Text>
                </View>
              )}
              {cart.length > 0 && (
                <>
                  <Text style={s.price}>
                    Subtotal{" "}
                    {currency(
                      cart.reduce(
                        (sum, i) =>
                          sum +
                          Number(
                            products.find((p: any) => p.id === i.productId)
                              ?.price_kobo ?? 0,
                          ) *
                            i.quantity,
                        0,
                      ),
                    )}
                  </Text>
                  <Text style={s.body}>
                    Delivery fee: {currency(catalogue?.deliveryFee ?? 0)}
                  </Text>
                  {button(
                    user ? "Continue to Checkout" : "Sign In to Checkout",
                    () => {
                      if (!user) {
                        setScreen("login");
                        return;
                      }
                      setAddress({ ...address, name: user.name });
                      setScreen("checkout");
                    },
                  )}
                </>
              )}
            </>
          ) : screen === "checkout" ? (
            <>
              <Text style={s.greeting}>ORDER → REVIEW → CONFIRM</Text>
              <Text style={s.body}>
                Online payments are unconnected. Only enabled payment methods
                are shown below.
              </Text>
              <Text style={s.title}>Where are we delivering?</Text>
              {field("Recipient name", address.name, (v) =>
                setAddress({ ...address, name: v }),
              )}
              {field(
                "Nigerian mobile number",
                address.phone,
                (v) => setAddress({ ...address, phone: v }),
                { keyboardType: "phone-pad" },
              )}
              {field("Street address", address.street, (v) =>
                setAddress({ ...address, street: v }),
              )}
              <Text style={s.label}>Delivery area</Text>
              <View style={s.wrap}>
                {(catalogue?.zones ?? []).map((z: string) => (
                  <Pressable
                    style={[s.chip, address.zone === z && s.activeChip]}
                    key={z}
                    onPress={() => setAddress({ ...address, zone: z })}
                  >
                    <Text
                      style={{
                        color: address.zone === z ? "white" : "#52614c",
                      }}
                    >
                      {z}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {field("Delivery date (YYYY-MM-DD)", date, setDate, {
                placeholder: "2026-11-01",
              })}
              <Text style={s.label}>Delivery window</Text>
              <View style={s.wrap}>
                {(catalogue?.windows ?? []).map((w: string) => (
                  <Pressable
                    style={[s.chip, window === w && s.activeChip]}
                    key={w}
                    onPress={() => setWindow(w)}
                  >
                    <Text style={{ color: window === w ? "white" : "#52614c" }}>
                      {w}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <NativeRewardSelector
                api={api}
                initialValue={{
                  rewardPoints: rewardPoints ? Number(rewardPoints) : undefined,
                  rewardOfferId,
                }}
                onChange={(value) => {
                  setRewardPoints(
                    value.rewardPoints ? String(value.rewardPoints) : "",
                  );
                  setRewardOfferId(value.rewardOfferId ?? "");
                  setKey(null);
                }}
              />
              {catalogue?.codEnabled &&
                button(
                  "Pay cash on delivery",
                  () => {
                    setPaymentMethod("cash_on_delivery");
                    setKey(null);
                  },
                  paymentMethod !== "cash_on_delivery",
                )}
              {catalogue?.walletEnabled &&
                button(
                  "Pay with purchase credit",
                  () => {
                    setPaymentMethod("wallet");
                    setKey(null);
                  },
                  paymentMethod !== "wallet",
                )}
              <View style={s.notice}>
                <Text style={s.noticeText}>
                  {paymentMethod === "wallet"
                    ? "The full order total will be debited from your verified purchase credit."
                    : catalogue?.codEnabled
                      ? "Cash on delivery. Payment stays unverified until confirmed."
                      : "No payment method is currently enabled."}
                </Text>
              </View>
              {button(
                "Place Order",
                async () => {
                  setLoading(true);
                  try {
                    const requestKey =
                      key ?? (await import("expo-crypto")).randomUUID();
                    setKey(requestKey);
                    const o = await api("checkout", {
                      items: cart,
                      address,
                      date,
                      window,
                      instructions: "",
                      ...(rewardOfferId ? { rewardOfferId } : {}),
                      ...(rewardPoints
                        ? { rewardPoints: Number(rewardPoints) }
                        : {}),
                      paymentMethod,
                      idempotencyKey: requestKey,
                    });
                    setCart([]);
                    setKey(null);
                    Alert.alert(
                      "Order received",
                      `${o.reference} · ${paymentMethod === "wallet" ? "Paid using purchase credit" : "Payment due on delivery"}`,
                    );
                    setScreen("orders");
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setLoading(false);
                  }
                },
                false,
                loading ||
                  !catalogue?.orderingEnabled ||
                  (paymentMethod === "wallet"
                    ? !catalogue?.walletEnabled
                    : !catalogue?.codEnabled),
              )}
            </>
          ) : screen === "orders" ? (
            <>
              {orderFilter &&
                button("Show all orders", () => setOrderFilter(null), true)}
              {!customerView && (
                <Text style={s.title}>
                  {driver ? "Assigned Deliveries" : "Your Orders"}
                </Text>
              )}
              {driver && (
                <DriverOperations
                  key={user.id}
                  api={api}
                  user={user}
                  origin={origin}
                  token={token}
                />
              )}
              {driver && pendingDeliveries.length > 0 && (
                <View style={s.notice}>
                  <Text style={s.noticeText}>
                    {pendingDeliveries.length} delivery records await server
                    verification. Offline records do not mark an order
                    delivered.
                  </Text>
                  {button(
                    syncing
                      ? "Synchronising…"
                      : "Synchronise pending deliveries",
                    syncDeliveries,
                    false,
                    syncing,
                  )}
                  {pendingDeliveries.map((event) => (
                    <View key={event.id}>
                      <Text style={s.caption}>
                        {event.error ?? "Awaiting connection"}
                      </Text>
                      {button(
                        "Discard this pending record",
                        () =>
                          Alert.alert(
                            "Discard pending delivery?",
                            "The server order will remain unchanged.",
                            [
                              { text: "Keep", style: "cancel" },
                              {
                                text: "Discard",
                                style: "destructive",
                                onPress: async () => {
                                  const q = pendingDeliveries.filter(
                                    (q) => q.id !== event.id,
                                  );
                                  await saveQueue(user.id, q);
                                  setPendingDeliveries(q);
                                },
                              },
                            ],
                          ),
                        true,
                      )}
                    </View>
                  ))}
                </View>
              )}
              {orders.length ? (
                orders.map((o) => (
                  <View style={s.card} key={o.id}>
                    {!driver &&
                    user &&
                    ["customer", "commercial"].includes(user.role) ? (
                      <TrackingSummary
                        order={o}
                        onSupport={() => setScreen("conversations")}
                      />
                    ) : (
                      <Text style={s.productName}>{o.reference}</Text>
                    )}
                    <OrderVisit
                      api={api}
                      order={o}
                      driver={driver}
                      origin={origin}
                      token={token}
                      onDone={async () => setOrders(await api("orders"))}
                    />
                    <Text style={s.sectionTitle}>
                      {o.status.replaceAll("_", " ")}
                    </Text>
                    <Text style={s.body}>
                      {(o.gas_lines ?? [])
                        .map(
                          (g: any) =>
                            `${Number(g.grams) / 1000} kg gas (${Number(g.capacity_grams) / 1000} kg cylinder)`,
                        )
                        .join(", ")}{" "}
                      {o.items
                        .map((i: any) => `${i.quantity} × ${i.name}`)
                        .join(", ")}
                    </Text>
                    <Text style={s.body}>
                      {o.address.street}, {o.address.zone}
                    </Text>
                    <Text style={s.productPrice}>{currency(o.total_kobo)}</Text>
                    <Text style={s.caption}>
                      Payment: {o.payment_status} · GPS and ETA unavailable
                    </Text>
                    {!driver &&
                      o.status === "delivered" &&
                      o.payment_status === "verified" && (
                        <>
                          <NativePartialRefund api={api} orderId={o.id} />
                          <NativeForm
                            api={api}
                            action="refund.request"
                            title="Request refund as purchase credit"
                            fields={[
                              {
                                name: "orderId",
                                label: "",
                                type: "hidden",
                                value: o.id,
                              },
                              {
                                name: "reason",
                                label: "Reason (at least 10 characters)",
                              },
                              {
                                name: "acceptWalletCredit",
                                label:
                                  "I agree to receive an approved refund as purchase credit",
                                type: "checkbox",
                              },
                            ]}
                          />
                        </>
                      )}
                    {o.confirmation_code &&
                      !["delivered", "cancelled"].includes(o.status) && (
                        <View style={s.notice}>
                          <Text style={s.noticeText}>
                            Delivery code: {o.confirmation_code}. Share only
                            after receiving all your items.
                          </Text>
                        </View>
                      )}
                    {driver &&
                      o.events.map((e: any, i: number) => (
                        <Text style={s.event} key={i}>
                          ✓ {e.status.replaceAll("_", " ")} ·{" "}
                          {new Date(e.created_at).toLocaleString()}
                        </Text>
                      ))}
                    {driver && (
                      <View>
                        <Text style={s.body}>
                          Physical load to verify: {JSON.stringify(o.manifest)}
                        </Text>
                        {button("Open navigation", () =>
                          Linking.openURL(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address.street + ", " + o.address.zone)}`,
                          ),
                        )}
                        <NativeForm
                          api={(action, data) =>
                            api(action, {
                              ...data,
                              version: Number(data.version),
                              operationKey: trackingKey("delivery.help", o),
                            })
                          }
                          action="delivery.help"
                          key={`${o.id}:${o.tracking_version}:help`}
                          title="Request dispatch help"
                          fields={[
                            {
                              name: "orderId",
                              label: "Order",
                              type: "hidden",
                              value: o.id,
                            },
                            {
                              name: "version",
                              label: "Version",
                              type: "hidden",
                              value: o.tracking_version,
                            },
                            {
                              name: "reason",
                              label:
                                "Describe the delivery problem and assistance needed",
                            },
                          ]}
                        />
                      </View>
                    )}
                    {driver &&
                      o.status === "out_for_delivery" &&
                      o.attempt?.state === "picked_up" &&
                      button("Mark arrived", async () => {
                        try {
                          await api("delivery.arrived", {
                            orderId: o.id,
                            version: o.tracking_version,
                            operationKey: trackingKey("delivery.arrived", o),
                            reason:
                              "Driver confirms arrival at the assigned delivery address",
                          });
                          setOrders(await api("orders"));
                        } catch (e: any) {
                          setError(e.message);
                        }
                      })}
                    {driver &&
                      o.status === "assigned" &&
                      o.attempt?.state === "assigned" && (
                        <NativeForm
                          api={(action, data) =>
                            api(action, {
                              ...data,
                              version: Number(data.version),
                              manifest: o.manifest,
                              operationKey: trackingKey("delivery.pickup", o),
                            })
                          }
                          action="delivery.pickup"
                          key={`${o.id}:${o.tracking_version}:pickup`}
                          title="Check physical pickup"
                          recordVersion={o.tracking_version}
                          fields={[
                            {
                              name: "orderId",
                              label: "Order",
                              type: "hidden",
                              value: o.id,
                            },
                            {
                              name: "version",
                              label: "Version",
                              type: "hidden",
                              value: o.tracking_version,
                            },
                            {
                              name: "reason",
                              label:
                                "Physical quantity and serial inspection notes",
                            },
                          ]}
                          onDone={async () => setOrders(await api("orders"))}
                        />
                      )}
                    {driver &&
                      o.status === "assigned" &&
                      button(
                        o.status === "assigned"
                          ? "Confirm Pickup & Dispatch"
                          : "Report Delivery Failure",
                        async () => {
                          try {
                            await api("order.transition", {
                              id: o.id,
                              operationKey: trackingKey("order.transition", o),
                              version: o.tracking_version,
                              status:
                                o.status === "assigned"
                                  ? "out_for_delivery"
                                  : "delivery_failed",
                              note:
                                o.status === "assigned"
                                  ? "Driver confirmed collection and dispatch."
                                  : "Driver reported unsuccessful delivery. Follow up required.",
                            });
                            setOrders(await api("orders"));
                          } catch (e: any) {
                            setError(e.message);
                          }
                        },
                      )}
                    {driver && o.status === "out_for_delivery" && (
                      <DriverPhoto userId={user.id} orderId={o.id} />
                    )}
                    {driver && o.status === "out_for_delivery" && (
                      <NativeForm
                        key={`${o.id}:${o.tracking_version}:failure`}
                        api={(action, data) =>
                          api(action, {
                            ...data,
                            version: Number(data.version),
                            operationKey: trackingKey("delivery.failure", o),
                          })
                        }
                        action="order.transition"
                        title="Report unsuccessful delivery"
                        fields={[
                          {
                            name: "id",
                            label: "Order",
                            type: "hidden",
                            value: o.id,
                          },
                          {
                            name: "version",
                            label: "Version",
                            type: "hidden",
                            value: o.tracking_version,
                          },
                          {
                            name: "status",
                            label: "State",
                            type: "hidden",
                            value: "delivery_failed",
                          },
                          {
                            name: "failureReason",
                            label: "Failure reason",
                            options: deliveryFailureReasons.map((r) => ({
                              value: r,
                              label: r.replaceAll("_", " "),
                            })),
                          },
                          {
                            name: "note",
                            label:
                              "Evidence, observed problem and required next step",
                          },
                        ]}
                        onDone={async () => setOrders(await api("orders"))}
                      />
                    )}
                    {driver && o.status === "out_for_delivery" && (
                      <NativeDelivery
                        order={o}
                        submit={async (data) => {
                          try {
                            await api("delivery.complete", data);
                            setOrders(await api("orders"));
                          } catch (e: any) {
                            if (e.status) throw e;
                            const q = await enqueueDelivery(user.id, data);
                            if (accountRef.current === user.id)
                              setPendingDeliveries(q);
                            Alert.alert(
                              "Saved for synchronisation",
                              "This encrypted device record awaits server verification. The order is not yet marked delivered.",
                            );
                          }
                        }}
                      />
                    )}
                  </View>
                ))
              ) : (
                <View style={s.card}>
                  <Text style={s.sectionTitle}>
                    Your first delivery is still ahead.
                  </Text>
                  <Text style={s.body}>
                    Real order updates will appear here.
                  </Text>
                </View>
              )}
            </>
          ) : screen === "rewards" ? (
            <NativeEasyRewards
              api={api}
              onOrder={(id) => {
                setOrderFilter(id);
                setScreen("orders");
              }}
              onOffer={(o) => {
                setRewardPoints(String(o.points));
                setRewardOfferId(o.id);
                setKey(null);
                setScreen(cart.length ? "checkout" : "products");
              }}
            />
          ) : screen === "wallet" &&
            user &&
            ["customer", "commercial"].includes(user.role) ? (
            <CustomerWallet
              key={user.id}
              wallet={wallet}
              api={api}
              userId={user.id}
              navigate={navigateCustomer}
              reload={async () => setWallet(await api("wallet"))}
            />
          ) : screen === "wallet" ? (
            <>
              <Text style={s.title}>My Wallet</Text>
              <View style={s.balance}>
                <Text style={{ color: "#e3efdf" }}>
                  EasyGas purchase credit
                </Text>
                <Text style={s.balanceNumber}>
                  {wallet ? currency(wallet.balanceKobo) : "Loading…"}
                </Text>
              </View>
              <View style={s.notice}>
                <Text style={s.noticeText}>
                  External top-ups remain unconnected. See Credit &amp;
                  redemption for verified credits.
                </Text>
              </View>
              {wallet?.entries.map((e: any) => (
                <View style={s.card} key={e.id}>
                  <Text style={s.productName}>{e.kind}</Text>
                  <Text>{currency(e.amount_kobo)}</Text>
                  <Text style={s.caption}>{e.reference}</Text>
                </View>
              ))}
            </>
          ) : screen === "more" &&
            user &&
            ["customer", "commercial"].includes(user.role) ? (
            <AccountHub
              key={user.id}
              user={user}
              api={api}
              navigate={navigateCustomer}
              logout={logout}
            />
          ) : screen === "support" ? (
            <Support
              send={async (data) => {
                await api("support.create", data);
              }}
            />
          ) : (
            <>
              <Text style={s.greeting}>MY ACCOUNT</Text>
              <Text style={s.title}>{user?.name ?? "Your EasyGas"}</Text>
              <Text style={s.body}>{user?.email}</Text>
              {[
                ["Appearance", "appearance"],
                ["Browse Products", "products"],
                ["Shopping Cart", "cart"],
                ["Book a Service", "services"],
                ["Products & Appointments", "combined-checkout"],
                ["My Service Bookings", "bookings"],
                ["Notifications", "notifications"],
                ["My Orders", "orders"],
                ["My Wallet", "wallet"],
                ["My Rewards", "rewards"],
                ["Help & Support", "conversations"],
                ["Account & privacy", "profile"],
                ["Cooking gas profiles", "consumption"],
                ["Refill plans", "plans"],
                ["Recurring orders", "recurring"],
                ["Credit & redemption", "credit"],
              ].map(([text, dest]) => (
                <Pressable
                  style={s.menuItem}
                  key={dest}
                  onPress={() =>
                    setScreen(user || dest === "appearance" ? dest : "login")
                  }
                >
                  <Text>{text}</Text>
                  <Text>›</Text>
                </Pressable>
              ))}
              {user && button("Sign Out", logout, true)}
            </>
          )}
        </ScrollView>
      </ScreenTitleContext.Provider>
      <View style={s.bottomNav}>
        {(driver || (user && !["customer", "commercial"].includes(user.role))
          ? [
              ["Home", "home"],
              ["Products", "products"],
              [driver ? "Deliveries" : "Orders", "orders"],
              ["Cart", "cart"],
              ["More", "more"],
            ]
          : [
              ["Home", "home"],
              ["Orders", "orders"],
              ["Services", "services"],
              ["Wallet", "wallet"],
              ["Account", "more"],
            ]
        ).map(([text, dest]) => (
          <Pressable
            key={dest}
            accessibilityRole="tab"
            accessibilityLabel={text}
            accessibilityState={{ selected: screen === dest }}
            style={[s.navItem, { minHeight: 56 }]}
            onPress={() =>
              customerView ? navigateCustomer(dest) : setScreen(dest)
            }
          >
            <Ionicons
              accessible={false}
              name={
                (
                  {
                    home: "home-outline",
                    products: "cube-outline",
                    orders: "bag-check-outline",
                    cart: "cart-outline",
                    services: "construct-outline",
                    wallet: "wallet-outline",
                    more: customerView
                      ? "person-outline"
                      : "ellipsis-horizontal",
                  } as const
                )[dest as "home"] ?? "ellipse-outline"
              }
              size={23}
              color={screen === dest ? colors.primary : colors.muted}
            />
            <Text
              preserveColor
              style={[
                s.navText,
                { color: colors.muted },
                screen === dest && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              {text}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function Support({
  send,
}: {
  send: (data: { subject: string; message: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  return (
    <>
      <Text style={s.title}>Here to help.</Text>
      {sent ? (
        <View style={s.card}>
          <Text style={s.body}>Your support request has been saved.</Text>
        </View>
      ) : (
        <>
          <Text style={s.label}>Subject</Text>
          <TextInput
            style={s.input}
            accessibilityLabel="Subject"
            value={subject}
            onChangeText={setSubject}
          />
          <Text style={s.label}>How can we help?</Text>
          <TextInput
            style={[s.input, { height: 130, textAlignVertical: "top" }]}
            multiline
            accessibilityLabel="Support message"
            value={message}
            onChangeText={setMessage}
          />
          {error ? <Text>{error}</Text> : null}
          <Pressable
            style={s.button}
            onPress={async () => {
              try {
                await send({ subject, message });
                setSent(true);
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            <Text style={s.buttonText}>Send Support Request</Text>
          </Pressable>
        </>
      )}
    </>
  );
}
const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: "white", paddingTop: 0 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#edf1e8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wordmark: {
    fontSize: 30,
    fontWeight: "900",
    color: "#07592e",
    letterSpacing: -1.5,
  },
  location: { fontSize: 15, color: "#667360", marginTop: 4 },
  headerAction: { fontSize: 15, fontWeight: "700", color: "#07592e" },
  content: { padding: 22, paddingBottom: 35 },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#10251c",
    letterSpacing: -1,
    marginVertical: 12,
  },
  greeting: { fontSize: 15, color: "#65705f" },
  body: { fontSize: 15, lineHeight: 24, color: "#6a7464", marginVertical: 8 },
  caption: {
    fontSize: 15,
    lineHeight: 24,
    color: "#8b9680",
    marginVertical: 5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#10251c",
    marginTop: 8,
    marginBottom: 9,
    letterSpacing: -0.4,
  },
  button: {
    backgroundColor: "#087a36",
    borderRadius: 13,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    minHeight: 48,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  secondary: {
    backgroundColor: "#f1f7ed",
    borderWidth: 1,
    borderColor: "#e3ecda",
  },
  card: {
    padding: 19,
    borderWidth: 1,
    borderColor: "#e7eddf",
    borderRadius: 16,
    marginBottom: 15,
  },
  refillCard: {
    backgroundColor: "#f4f8ed",
    padding: 19,
    borderRadius: 17,
    marginVertical: 12,
  },
  planCard: {
    backgroundColor: "#edf7e9",
    borderRadius: 16,
    padding: 18,
    marginVertical: 15,
  },
  field: { marginVertical: 7 },
  label: {
    fontSize: 15,
    color: "#24361f",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8da",
    borderRadius: 10,
    padding: 13,
    backgroundColor: "#fcfdf9",
    fontSize: 15,
    color: "#142c20",
  },
  shortcuts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 9,
    marginVertical: 13,
  },
  shortcut: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "#f5f9f0",
    borderRadius: 14,
    padding: 12,
  },
  shortcutIcon: { fontSize: 23, color: "#07592e", marginBottom: 5 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  miniProduct: {
    flex: 1,
    minWidth: 90,
    borderWidth: 1,
    borderColor: "#e7eddf",
    padding: 9,
    borderRadius: 13,
  },
  product: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e7eddf",
    borderRadius: 13,
    padding: 11,
    marginBottom: 5,
  },
  productArt: { height: 125, alignItems: "center", justifyContent: "center" },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#142c20",
    marginVertical: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#142c20",
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#f3f6ef",
    marginRight: 7,
    marginBottom: 6,
  },
  activeChip: { backgroundColor: "#07592e" },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: "#10251c",
    marginVertical: 15,
  },
  notice: {
    backgroundColor: "#fff6e7",
    borderRadius: 11,
    padding: 14,
    marginVertical: 12,
  },
  noticeText: { fontSize: 15, lineHeight: 24, color: "#8a672e" },
  cartRow: {
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#edf0e8",
    paddingVertical: 10,
  },
  remove: { fontSize: 15, color: "#bb5a28", marginTop: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginVertical: 10 },
  balance: {
    backgroundColor: "#07592e",
    borderRadius: 19,
    padding: 25,
    marginVertical: 15,
  },
  balanceNumber: {
    fontSize: 36,
    color: "white",
    fontWeight: "800",
    marginTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 19,
    borderBottomWidth: 1,
    borderColor: "#edf0e8",
  },
  event: { fontSize: 15, color: "#698062", lineHeight: 24 },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#e8eedf",
    paddingBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 12,
    justifyContent: "space-around",
  },
  navItem: { alignItems: "center", minWidth: 0, flex: 1, paddingHorizontal: 4 },
  navSymbol: { fontSize: 23, color: "#a3ad99" },
  navText: { fontSize: 15, color: "#9aa48e", marginTop: 3 },
});
function NativeDelivery({
  order,
  submit,
}: {
  order: any;
  submit: (data: any) => Promise<void>;
}) {
  const [operationKey] = useState(randomUUID),
    [handover, setHandover] = useState(false);
  const [code, setCode] = useState(""),
    [amount, setAmount] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <View style={s.refillCard}>
      <Text style={s.sectionTitle}>Confirm delivery</Text>
      <Text style={s.body}>
        Ask for the customer's code after handing over all items. Cash will need
        independent finance verification.
      </Text>
      <Text style={s.label}>Customer confirmation code</Text>
      <TextInput
        style={s.input}
        accessibilityLabel="Customer confirmation code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <Text style={s.label}>
        {order.payment_method === "wallet"
          ? "Paid with purchase credit — collect no cash"
          : "Cash actually collected (₦)"}
      </Text>
      <TextInput
        style={s.input}
        accessibilityLabel="Cash collected in naira"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: handover }}
        onPress={() => setHandover(!handover)}
        style={s.button}
      >
        <Text style={s.buttonText}>
          {handover ? "✓ " : ""}I checked all quantities and serials and handed
          over every item
        </Text>
      </Pressable>
      {error ? <Text style={s.noticeText}>{error}</Text> : null}
      <Pressable
        style={[s.button, busy && { opacity: 0.5 }]}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError("");
          try {
            await submit({
              orderId: order.id,
              operationKey,
              version: order.tracking_version,
              handover,
              code,
              collectedKobo:
                order.payment_method === "wallet"
                  ? 0
                  : Math.round(Number(amount) * 100),
            });
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Text style={s.buttonText}>
          {busy ? "Recording…" : "Record Delivery & Cash"}
        </Text>
      </Pressable>
    </View>
  );
}

function NativeCompatibility({
  api,
  productId,
}: {
  api: (a: string) => Promise<any>;
  productId: string;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("compatibility?productId=" + encodeURIComponent(productId))
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [productId]);
  return (
    <View>
      <Text style={s.sectionTitle}>Equipment compatibility</Text>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {!rows.length && (
        <Text style={s.body}>
          No independently reviewed match is published. Professional
          confirmation is required.
        </Text>
      )}
      {rows.map((c) => (
        <View key={c.id}>
          <Text style={s.body}>
            {c.equipment_brand} · {c.equipment_model} ·{" "}
            {c.status.replaceAll("_", " ")}
          </Text>
          <Text style={s.body}>
            {c.connection_spec} · {c.pressure_spec}
          </Text>
          <Text style={s.body}>{c.evidence}</Text>
        </View>
      ))}
    </View>
  );
}
