import React, { useEffect, useRef, useState } from "react";
import { AppState, Modal, Platform, ScrollView, View } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import {
  digestStringAsync,
  CryptoDigestAlgorithm,
  randomUUID,
} from "expo-crypto";
import {
  assignmentActorBranch,
  pendingAssignmentAlerts,
  currentAlertOrder,
  assignmentNotification,
  readAlertLedger,
  type AssignmentAlert,
} from "../../packages/business-rules/src/driver-assignment-alerts";
import {
  Button,
  Card,
  Copy,
  Feedback,
  Title,
  type CustomerAPI,
} from "./CustomerUI";
import { FieldCaption, TextInput } from "./typography";
import { useTheme } from "./theme";

const channelId = "easygas-driver-assignments-v1";
export default function DriverAssignmentAlerts({
  api,
  user,
  origin,
  orders,
  snapshot,
  connected,
  revoked,
  showSettings,
  onReview,
  onRefresh,
}: {
  api: CustomerAPI;
  user: any;
  origin: string;
  orders: any[];
  snapshot: any;
  connected: boolean;
  revoked: boolean;
  showSettings: boolean;
  onReview: (order: any) => void;
  onRefresh: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const player = useAudioPlayer(require("./assets/driver-assignment.wav"));
  const playback = useAudioPlayerStatus(player);
  const [scope, setScope] = useState("");
  const [permission, setPermission] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [alert, setAlert] = useState<AssignmentAlert | "test" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const seen = useRef(new Set<string>());
  const alive = useRef(false),
    running = useRef(false),
    generation = useRef(0);
  const operationKeys = useRef(new Map<string, string>());
  const latest = useRef({
    api,
    orders,
    snapshot,
    connected,
    revoked,
    user,
    onReview,
    onRefresh,
  });
  latest.current = {
    api,
    orders,
    snapshot,
    connected,
    revoked,
    user,
    onReview,
    onRefresh,
  };
  const allowed = permission?.granted === true;
  const branchId = assignmentActorBranch(user);
  const actorScope = `${origin}|${user.id}|${branchId}`;
  const keyFor = (value: string) => `driver.assignment-alerts.${value}`;
  async function permissions(request = false) {
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(channelId, {
        name: "Delivery assignments",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    const p = request
      ? await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: true },
        })
      : await Notifications.getPermissionsAsync();
    if (alive.current) setPermission(p);
    return p;
  }
  async function sound(value: AssignmentAlert | "test", activeScope: string) {
    const p = await Notifications.getPermissionsAsync();
    if (!alive.current || activeScope !== scope || !p.granted) return;
    if (AppState.currentState === "active" && p.ios?.allowsSound !== false) {
      const channel =
        Platform.OS === "android"
          ? await Notifications.getNotificationChannelAsync(channelId)
          : null;
      if (Platform.OS !== "android" || channel?.sound) {
        await setAudioModeAsync({
          playsInSilentMode: false,
          allowsRecording: false,
          shouldPlayInBackground: false,
          interruptionMode: "mixWithOthers",
          shouldRouteThroughEarpiece: false,
        });
        if (
          !alive.current ||
          activeScope !== scope ||
          AppState.currentState !== "active"
        )
          return;
        player.volume = 0.8;
        await player.seekTo(0);
        player.play();
      }
    }
    await Notifications.scheduleNotificationAsync({
      identifier: `driver-assignment-${activeScope}-${value === "test" ? "test" : value.attemptId}`,
      content:
        value === "test"
          ? {
              title: "EasyGas · Test assignment alert",
              body: "Sound and popup test only. No order has been assigned or acknowledged.",
              sound: "default",
              data: { kind: "driver-assignment-test", scope: activeScope },
            }
          : assignmentNotification(value, activeScope),
      trigger: Platform.OS === "android" ? { channelId } : null,
    });
  }
  useEffect(() => {
    alive.current = true;
    const seq = ++generation.current;
    setScope("");
    setAlert(null);
    setReason("");
    setError("");
    setNotice("");
    seen.current.clear();
    void (async () => {
      const nextScope = await digestStringAsync(
        CryptoDigestAlgorithm.SHA256,
        actorScope,
      );
      const raw = await SecureStore.getItemAsync(keyFor(nextScope));
      if (!alive.current || generation.current !== seq) return;
      seen.current = new Set(readAlertLedger(raw));
      setScope(nextScope);
      await permissions();
    })().catch(() => {
      if (alive.current && generation.current === seq)
        setError(
          "Assignment alert settings could not be loaded. Use Orders to review current assignments.",
        );
    });
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void permissions().catch(() => {});
      else player.pause();
    });
    return () => {
      alive.current = false;
      ++generation.current;
      operationKeys.current.clear();
      listener.remove();
    };
  }, [actorScope]);
  useEffect(() => {
    if (!scope) return;
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        const d = n.request.content.data ?? {};
        const show =
          alive.current &&
          latest.current.connected &&
          !latest.current.revoked &&
          d.scope === scope &&
          (d.kind === "driver-assignment-test" ||
            pendingAssignmentAlerts(
              latest.current.orders,
              latest.current.snapshot?.responses ?? [],
              latest.current.user.id,
              assignmentActorBranch(latest.current.user),
            ).some(
              (a) => a.orderId === d.orderId && a.attemptId === d.attemptId,
            ));
        return {
          shouldShowBanner: show,
          shouldShowList: show,
          // The foreground popup uses one bundled chime; avoid two overlapping tones.
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
    const listener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const d = response.notification.request.content.data ?? {};
        if (
          d.scope !== scope ||
          d.kind !== "driver-assignment" ||
          latest.current.revoked
        )
          return;
        void (async () => {
          const [list, snap] = await Promise.all([
            latest.current.api(
              "orders?active=1&id=" + encodeURIComponent(String(d.orderId)),
            ),
            latest.current.api("driver.snapshot"),
          ]);
          if (!alive.current || generation.current !== seq) return;
          const item = pendingAssignmentAlerts(
            list,
            snap.responses ?? [],
            user.id,
            branchId,
          ).find((a) => a.attemptId === d.attemptId);
          if (item)
            latest.current.onReview(
              list.find((o: any) => o.id === item.orderId),
            );
        })().catch(() => {
          if (alive.current)
            setError(
              "Refresh Orders to verify whether this assignment is still current.",
            );
        });
      },
    );
    const seq = generation.current;
    return () => {
      listener.remove();
      Notifications.setNotificationHandler(null);
      void Notifications.getPresentedNotificationsAsync()
        .then((items) =>
          Promise.all(
            items
              .filter((n) => n.request.content.data?.scope === scope)
              .map((n) =>
                Notifications.dismissNotificationAsync(n.request.identifier),
              ),
          ),
        )
        .catch(() => {});
    };
  }, [scope]);
  useEffect(() => {
    if (!scope || revoked) {
      setAlert(null);
      return;
    }
    if (!connected || !snapshot || AppState.currentState !== "active") return;
    const current = pendingAssignmentAlerts(
      orders,
      snapshot.responses ?? [],
      user.id,
      branchId,
    );
    if (alert && alert !== "test") {
      if (
        !current.some((a) => a.key === alert.key && a.version === alert.version)
      )
        setAlert(null);
      return;
    }
    if (alert) return;
    const next = current.find((a) => !seen.current.has(a.key));
    if (!next) return;
    seen.current.add(next.key);
    setReason("");
    setError("");
    setAlert(next);
    void SecureStore.setItemAsync(
      keyFor(scope),
      JSON.stringify([...seen.current].slice(-256)),
    ).catch(() => {
      if (alive.current)
        setError(
          "Could not save alert history. An alert may repeat after restarting; server acknowledgement is unchanged.",
        );
    });
    void sound(next, scope).catch(() => {
      if (alive.current)
        setError(
          "Sound alert could not be presented. Review the assignment below.",
        );
    });
  }, [scope, orders, snapshot, connected, revoked, alert]);
  async function acknowledge() {
    if (
      !alert ||
      alert === "test" ||
      running.current ||
      !connected ||
      revoked ||
      reason.trim().length < 5
    )
      return;
    const candidate = alert,
      note = reason.trim(),
      seq = generation.current;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const [list, snap] = await Promise.all([
        api("orders?active=1&id=" + encodeURIComponent(candidate.orderId)),
        api("driver.snapshot"),
      ]);
      if (!alive.current || seq !== generation.current) return;
      const current = currentAlertOrder(
        candidate,
        list,
        snap.responses ?? [],
        user.id,
        branchId,
      );
      if (!current)
        throw new Error(
          "Assignment changed. Refresh Orders before responding.",
        );
      const signature = candidate.key + "|" + candidate.version + "|" + note;
      if (!operationKeys.current.has(signature))
        operationKeys.current.set(signature, randomUUID());
      await api("dispatch.respond", {
        orderId: current.id,
        version: current.tracking_version,
        decision: "acknowledged",
        reason: note,
        operationKey: operationKeys.current.get(signature),
      });
      if (!alive.current || seq !== generation.current) return;
      setAlert(null);
      setNotice(
        "Assignment acknowledged by EasyGas. Pickup and delivery are still separate steps.",
      );
      onReview(current);
      try {
        await onRefresh();
      } catch {
        setNotice(
          "Acknowledgement recorded. Refresh Orders to confirm the latest status.",
        );
      }
    } catch (e: any) {
      if (alive.current && seq === generation.current)
        setError(
          e.message ||
            "Could not confirm acknowledgement. Reconnect and retry.",
        );
    } finally {
      running.current = false;
      if (alive.current && seq === generation.current) setBusy(false);
    }
  }
  return (
    <>
      {showSettings && (
        <Card>
          <Title>Assignment popup & sound</Title>
          {playback.playing && <Copy>Playing assignment chime</Copy>}
          <Copy>
            {permission
              ? allowed
                ? "Notifications allowed. The foreground chime follows notification permission, device volume and silent mode."
                : "Sound/banner permission is off. In-app assignment popups still appear."
              : "Checking notification permission…"}
          </Copy>
          <Copy>
            While EasyGas is open, current assignments are checked every 15
            seconds. Closed-app push delivery is not configured.
          </Copy>
          <Button
            label="Enable assignment sound & banners"
            secondary
            onPress={() => {
              void permissions(true).catch(() =>
                setError(
                  "Could not request notification permission. Check device settings.",
                ),
              );
            }}
          />
          <Button
            label="Test assignment popup & sound"
            secondary
            onPress={() => {
              setAlert("test");
              setError("");
              void sound("test", scope).catch(() =>
                setError(
                  "Sound could not be presented. Check notification and volume settings.",
                ),
              );
            }}
            disabled={!scope}
          />
          <Button
            label="Open notification settings"
            secondary
            onPress={() => {
              void import("react-native")
                .then(({ Linking }) => Linking.openSettings())
                .catch(() => setError("Device settings could not be opened."));
            }}
          />
        </Card>
      )}
      {notice ? <Copy>{notice}</Copy> : null}
      {!alert && error ? <Copy>{error}</Copy> : null}
      <Modal
        visible={alert !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setAlert(null);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: colors.overlay,
          }}
          accessibilityViewIsModal
        >
          <ScrollView
            style={{
              maxHeight: "85%",
              flexGrow: 0,
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Title>
              {alert === "test"
                ? "Test assignment alert"
                : "New delivery assignment"}
            </Title>
            <Copy>
              {alert === "test"
                ? "This tests the popup and notification sound only. No order or acknowledgement is created."
                : alert?.reference}
            </Copy>
            <Copy>
              Opening or dismissing this alert does not acknowledge a delivery.
            </Copy>
            {!allowed && (
              <Copy>
                Sound permission is off. Enable assignment sound in Profile.
              </Copy>
            )}
            {alert && alert !== "test" && (
              <>
                <FieldCaption required>Acknowledgement reason</FieldCaption>
                <TextInput
                  accessibilityLabel="Assignment alert acknowledgement reason, required"
                  value={reason}
                  onChangeText={setReason}
                  maxLength={500}
                  editable={!busy && connected && !revoked}
                  style={{
                    color: colors.text,
                    backgroundColor: colors.input,
                    padding: 14,
                    borderRadius: 12,
                  }}
                />
                <Button
                  label={
                    busy
                      ? "Confirming acknowledgement…"
                      : "Acknowledge assignment"
                  }
                  disabled={
                    busy || !connected || revoked || reason.trim().length < 5
                  }
                  onPress={() => void acknowledge()}
                />
                <Button
                  label="Review assigned order"
                  secondary
                  disabled={busy || !connected || revoked}
                  onPress={() => {
                    const current = currentAlertOrder(
                      alert,
                      orders,
                      snapshot?.responses ?? [],
                      user.id,
                      branchId,
                    );
                    if (current) {
                      setAlert(null);
                      onReview(current);
                    } else
                      setError(
                        "Assignment changed. Refresh Orders before responding.",
                      );
                  }}
                />
                {!connected && (
                  <Copy>
                    Connection unavailable. Reconnect to confirm this
                    assignment.
                  </Copy>
                )}
              </>
            )}
            <Feedback error={error} />
            <Button
              label={alert === "test" ? "Close test alert" : "Not now"}
              secondary
              disabled={busy}
              onPress={() => setAlert(null)}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
