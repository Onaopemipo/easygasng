import { createInterface } from "node:readline/promises";
export async function prompt(label: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(label);
  } finally {
    rl.close();
  }
}
export async function secret(label: string): Promise<string> {
  if (!process.stdin.isTTY)
    throw new Error(
      "Run account setup in an interactive terminal. Passwords are entered silently.",
    );
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      error ? reject(error) : resolve(value);
    };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u0003") {
          finish(new Error("Setup cancelled."));
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && value.length < 129) value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}
