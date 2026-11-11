import React, { useState } from "react";
import { TextInput } from "react-native";
import { Card, Copy, Title } from "./CustomerUI";
import { Pressable } from "./surfaces";
import { Text } from "./typography";
import { useTheme } from "./theme";

type Customer = { id: string; name: string; public_customer_id: string; contact_phone: string | null };

export function SalesCustomerLookup({ api }: {
  api: (action: string, data: { query: string }) => Promise<{ customers: Customer[]; duplicate: boolean }>;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof api>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api("customers.lookup", { query: query.trim() }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Search failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Title>Find a customer</Title>
      <Copy>Search by Nigerian phone number or public customer ID.</Copy>
      <TextInput
        accessibilityLabel="Phone number or customer ID"
        value={query}
        onChangeText={value => { setQuery(value); setResult(null); setError(""); }}
        editable={!busy}
        autoCorrect={false}
        style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 44 }}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || query.trim().length < 5}
        onPress={search} style={{ minHeight: 44, justifyContent: "center" }}>
        <Text>{busy ? "Searching…" : "Search"}</Text>
      </Pressable>
      {result?.duplicate && <Copy>Multiple customers match. Confirm the public customer ID.</Copy>}
      {result?.customers.length === 0 && <Copy>No matching customers in your branch scope.</Copy>}
      {result?.customers.map(customer => (
        <Card key={customer.id}>
          <Text>{customer.name}</Text>
          <Copy>{customer.public_customer_id}{customer.contact_phone ? ` · ${customer.contact_phone}` : ""}</Copy>
        </Card>
      ))}
    </Card>
  );
}
