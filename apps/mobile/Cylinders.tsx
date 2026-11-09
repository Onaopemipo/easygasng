import React, { useState } from "react";
import { View, Image } from "react-native";
import {
  Title,
  Card,
  Copy,
  Button,
  Feedback,
  useRemote,
  type CustomerAPI,
} from "./CustomerUI";
import { NativeForm } from "./Workflows";
import { Text } from "./typography";
import { useTheme } from "./theme";
export default function Cylinders({
  api,
  navigate,
}: {
  api: CustomerAPI;
  navigate: (screen: string) => void;
}) {
  const { colors } = useTheme();
  const resource = useRemote(api, "customer.dashboard", {
    widget: "cylinders",
  });
  const [request, setRequest] = useState(false);
  return (
    <View style={{ gap: 14 }}>
      <Title>My Cylinders</Title>
      <Feedback
        {...resource}
        retry={resource.reload}
        empty={
          resource.data?.length === 0
            ? "No physical cylinders are currently recorded against your account. Registration requires an EasyGas inspection."
            : undefined
        }
      />
      {resource.data?.map((c: any) => (
        <Card key={c.id}>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <Image
              accessible={false}
              source={require("./assets/cylinder-illustration.png")}
              resizeMode="contain"
              style={{ width: 55, height: 90 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                preserveColor
                style={{ color: colors.text, fontWeight: "800" }}
              >
                {c.size_kg} kg Cylinder
              </Text>
              <Copy>{c.serial}</Copy>
              <Copy>{c.status.replaceAll("_", " ")}</Copy>
              <Copy>Inspection due: {String(c.test_due).slice(0, 10)}</Copy>
            </View>
          </View>
        </Card>
      ))}
      <Button
        label={request ? "Close registration request" : "+ Register a Cylinder"}
        secondary
        onPress={() => setRequest((v) => !v)}
      />
      {request && (
        <Card>
          <Copy>
            This submits an inspection request. It does not certify a cylinder
            or change ownership, custody or stock. Do not send payment details.
          </Copy>
          <NativeForm
            api={api}
            action="support.create"
            title="Send registration request"
            fields={[
              {
                name: "subject",
                label: "Subject",
                value: "Cylinder registration inspection request",
              },
              {
                name: "message",
                label:
                  "Cylinder capacity, serial (if known) and inspection request",
              },
            ]}
            onDone={() => setRequest(false)}
          />
        </Card>
      )}
      <Button
        label="Cooking profiles & refill estimates"
        secondary
        onPress={() => navigate("consumption")}
      />
      <Card accent>
        <Text preserveColor style={{ color: colors.text, fontWeight: "700" }}>
          Cylinder Safety
        </Text>
        <Copy>
          Keep cylinders upright and ventilated. Profile changes never replace
          physical inspection or a recorded return.
        </Copy>
      </Card>
    </View>
  );
}
