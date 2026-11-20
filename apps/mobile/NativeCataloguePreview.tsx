import React, { useState } from "react";
import { View } from "./surfaces";
import { TextInput, Text } from "./typography";
import { Button, Copy, Card, Title } from "./CustomerUI";
import { nativeCataloguePreview } from "../../packages/business-rules/src/native-catalogue-preview";
export default function NativeCataloguePreview({
  products,
}: {
  products: any[];
}) {
  const [csv, setCsv] = useState(""),
    [rows, setRows] = useState<ReturnType<typeof nativeCataloguePreview>>([]),
    [error, setError] = useState("");
  return (
    <View style={{ gap: 12 }}>
      <Copy>
        Preview product metadata against the current catalogue. This preview
        makes no changes. Actual imports remain on hold.
      </Copy>
      <Copy>CSV headers: id,name,description,category,sizeKg,asset,safety</Copy>
      <TextInput
        accessibilityLabel="Product metadata CSV"
        multiline
        value={csv}
        onChangeText={(v) => {
          setCsv(v);
          setRows([]);
        }}
        style={{
          minHeight: 160,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
        }}
      />
      <Button
        label="Preview product rows"
        onPress={() => {
          try {
            setRows(nativeCataloguePreview(csv, products));
            setError("");
          } catch (e: any) {
            setRows([]);
            setError(e.message);
          }
        }}
      />
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {rows.length > 0 && (
        <Title>
          {rows.filter((r) => !r.errors.length).length} valid ·{" "}
          {rows.filter((r) => r.errors.length).length} need attention
        </Title>
      )}
      {rows.map((r) => (
        <Card key={r.row}>
          <Title>
            Row {r.row} · {r.name || r.id}
          </Title>
          <Copy>
            {r.existing
              ? "Existing product — would require review"
              : "New catalogue record — preview only"}
          </Copy>
          {r.errors.map((e, i) => (
            <Text key={i} accessibilityRole="alert">
              {e}
            </Text>
          ))}
        </Card>
      ))}
    </View>
  );
}
