const origin =
  process.env.EASYGAS_HEALTH_URL || "http://127.0.0.1:3000/api/status";
try {
  const response = await fetch(origin, {
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  if (!response.ok || (await response.json()).status !== "ready")
    throw new Error();
  console.log("Application, schema and worker are ready.");
} catch {
  console.error("Application readiness probe failed.");
  process.exitCode = 1;
}
export {};
