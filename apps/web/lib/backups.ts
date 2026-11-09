import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
const magic = Buffer.from("EASYGAS-BACKUP-1\n");
export function encryptBackup(data: Uint8Array, password: string): Buffer {
  if (password.length < 16 || password.length > 128)
    throw new Error("Use a backup passphrase between 16 and 128 characters.");
  const salt = randomBytes(16),
    nonce = randomBytes(12),
    key = scryptSync(password, salt, 32),
    cipher = createCipheriv("aes-256-gcm", key, nonce),
    encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([magic, salt, nonce, cipher.getAuthTag(), encrypted]);
}
export function decryptBackup(data: Uint8Array, password: string): Buffer {
  const buf = Buffer.from(data),
    start = magic.length;
  if (buf.length < start + 44 || !buf.subarray(0, start).equals(magic))
    throw new Error("Not an EasyGas encrypted backup.");
  const salt = buf.subarray(start, start + 16),
    nonce = buf.subarray(start + 16, start + 28),
    tag = buf.subarray(start + 28, start + 44),
    decipher = createDecipheriv(
      "aes-256-gcm",
      scryptSync(password, salt, 32),
      nonce,
    );
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([
      decipher.update(buf.subarray(start + 44)),
      decipher.final(),
    ]);
  } catch {
    throw new Error(
      "Backup authentication failed: wrong passphrase or damaged file.",
    );
  }
}
