import nacl from "tweetnacl";
export const hexBytes = (value: Uint8Array) =>
  Array.from(value, (b) => b.toString(16).padStart(2, "0")).join("");
export function unhex(value: string) {
  if (!/^(?:[a-f0-9]{2})+$/.test(value))
    throw new Error("Invalid encrypted queue encoding.");
  return Uint8Array.from(value.match(/../g)!, (v) => parseInt(v, 16));
}
export function sealFieldRecord(
  record: unknown,
  key: Uint8Array,
  nonce: Uint8Array,
) {
  return JSON.stringify({
    nonce: hexBytes(nonce),
    cipher: hexBytes(
      nacl.secretbox(
        new TextEncoder().encode(JSON.stringify(record)),
        nonce,
        key,
      ),
    ),
  });
}
export function openFieldRecord(
  value: string,
  key: Uint8Array,
  userId: string,
) {
  const v = JSON.parse(value);
  const plain = nacl.secretbox.open(unhex(v.cipher), unhex(v.nonce), key);
  if (!plain)
    throw new Error(
      "Queue authentication failed; preserve the device for recovery.",
    );
  const record = JSON.parse(new TextDecoder().decode(plain));
  if (record.userId !== userId) throw new Error("Queue account mismatch.");
  return record;
}
