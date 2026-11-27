// Run each existing read-only release guard before the web build.
await import("./same-visit-schema-check.ts");
await import("./phone-order-schema-check.ts");
await import("./default-user-branch-schema-check.ts");
await import("./admin-single-approval-schema-check.ts");
export {};
