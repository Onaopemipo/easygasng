import {
  nativeReportsForRole,
  nativeReportFilterKeys,
  nativeReportRequest,
} from "../../packages/business-rules/src/native-report-scope";
import NativeCataloguePreview from "./NativeCataloguePreview";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView } from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { Card, Copy, Title, Button } from "./CustomerUI";
import { ContextSheet } from "./ContextSheet";
import { NativeForm } from "./Workflows";
import { EasyGasLoader } from "./EasyGasLoader";
import { useTheme } from "./theme";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import {
  nativeWorkspaces,
  nativeContracts,
  nativeActionLabels,
  actionRoles,
  visibleWorkspaces,
  workspaceActions,
  nativeRequest,
  nativeRows,
  nativeWorkspaceRows,
  nativeActionRecordSources,
  fieldLabel,
  type NativeField,
} from "../../packages/business-rules/src/native-workspaces";
import { gasReportCsv } from "../../packages/business-rules/src/gas-report-export";
import { NativeWorkspaceSession } from "../../packages/business-rules/src/native-workspace-session";
type API = (action: string, data?: any) => Promise<any>;
type User = { id: string; role: string; branchId?: string; branch_id?: string };
const title = (r: any) =>
  String(
    r.name ||
      r.title ||
      r.customer_name ||
      r.reference ||
      r.serial ||
      r.label ||
      r.key ||
      r.report ||
      r.id ||
      "Recorded item",
  );
const words = (s: string) =>
  s.replace(/[_.]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const privateKey = /password|secret|token|credential|private.?key|api.?key/i;
export function NativeRecord({
  value,
  depth = 0,
}: {
  value: any;
  depth?: number;
}) {
  if (value === null || value === undefined) return <Copy>Unavailable</Copy>;
  if (typeof value === "boolean") return <Copy>{value ? "Yes" : "No"}</Copy>;
  if (typeof value !== "object") return <Copy>{String(value)}</Copy>;
  if (depth > 4)
    return <Copy>Further details are available in the source record.</Copy>;
  if (Array.isArray(value))
    return (
      <View style={{ gap: 10 }}>
        {value.length ? (
          value.slice(0, 50).map((row, i) => (
            <Card key={row?.id || i}>
              <NativeRecord value={row} depth={depth + 1} />
            </Card>
          ))
        ) : (
          <Copy>No records.</Copy>
        )}
        {value.length > 50 && (
          <Copy>
            Showing50 of{value.length}. Narrow the report scope to inspect more.
          </Copy>
        )}
      </View>
    );
  return (
    <View style={{ gap: 10 }}>
      {Object.entries(value)
        .filter(
          ([key]) => !privateKey.test(key) && !/(^id$|_id$|Id$)/.test(key),
        )
        .map(([key, v]) => (
          <View key={key} style={{ gap: 3 }}>
            <Text style={{ fontSize: 13, fontWeight: "700" }}>
              {fieldLabel(key)}
            </Text>
            {/(_kobo|Kobo)$/.test(key) && v != null ? (
              <Copy>
                ₦
                {(Number(v) / 100).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Copy>
            ) : (
              <NativeRecord value={v} depth={depth + 1} />
            )}
          </View>
        ))}
    </View>
  );
}
const lookups: Record<string, [string, string?]> = {
  productId: ["products.manage", "products"],
  supplierId: ["purchasing", "suppliers"],
  purchaseId: ["purchasing", "orders"],
  customerId: ["customers.manage"],
  userId: ["staff.manage", "people"],
  ownerId: ["staff.manage", "people"],
  driverId: ["tracking.drivers"],
  technicianId: ["technicians.workspace", "people"],
  serviceId: ["services.manage", "services"],
  orderId: ["orders"],
  bookingId: ["bookings"],
  holdId: ["business.snapshot", "holds"],
  branchId: ["branches"],
  sourceBranch: ["branches"],
  destinationBranch: ["branches"],
  staffId: ["staff.manage"],
  invoiceId: ["documents.list", "rows"],
  vehicleId: ["fleet.summary", "vehicles"],
  tripId: ["fleet.summary", "trips"],
  meterId: ["bulk.summary", "meters"],
  categoryId: ["business.snapshot", "categories"],
  delegateId: ["staff.manage", "people"],
};
function idOf(r: any) {
  return r.id || r.product_id || r.key;
}
function rawRows(result: any, path?: string) {
  return path
    ? Array.isArray(result?.[path])
      ? result[path]
      : []
    : nativeRows(result);
}
function initialValue(f: NativeField, record: any, user: User): any {
  const snake = f.name.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
  if (f.type === "checkbox")
    return ["active", "archived", "installationRequired", "blocked"].includes(
      f.name,
    )
      ? Boolean(record?.[f.name] ?? record?.[snake] ?? f.value)
      : false;
  if (f.name === "branchId" || f.name === "scope")
    return (
      record?.branch_id ||
      record?.scope ||
      user.branchId ||
      user.branch_id ||
      ""
    );
  if (f.name === "id") return record?.id || record?.key || "";
  if (f.name === "bookingId" && record?.service_id) return record.id;
  if (f.name === "orderId" && record?.tracking_version !== undefined)
    return record.id;
  if (f.name === "key") return record?.key || "";
  if (f.name === "version")
    return (
      record?.version ??
      record?.tracking_version ??
      record?.revision ??
      f.value ??
      ""
    );
  if (f.name === "revision") return record?.revision ?? "";
  if (f.name === "receivedDate") return new Date().toISOString().slice(0, 10);
  if (f.name === "reason" || f.name === "evidence") return "";
  if (f.name === "value" && record?.value !== undefined)
    return JSON.stringify(record.value);
  if (f.name === "expectedCalibrationReference")
    return record?.calibration_reference || "";
  if (f.name === "expectedCalibrationExpiresAt")
    return record?.calibration_expires_at || "";
  const v = record?.[f.name] ?? record?.[snake];
  if (v !== undefined) return /Kobo$/.test(f.name) ? Number(v) / 100 : v;
  if (
    [
      "meterId",
      "holdId",
      "supplierId",
      "userId",
      "followupId",
      "quoteId",
      "collectionId",
    ].includes(f.name) &&
    record?.id
  )
    return record.id;
  return f.value ?? "";
}
export function NativeContractForm({
  api,
  action,
  record,
  user,
  rows,
  onDone,
  onAuthorityLost,
}: {
  api: API;
  action: string;
  record: any;
  user: User;
  rows: any[];
  onDone: (result: any) => void;
  onAuthorityLost: () => void;
}) {
  const [options, setOptions] = useState<Record<string, any[]>>({}),
    [lookupError, setLookupError] = useState(""),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [groups, setGroups] = useState<Record<string, boolean>>({}),
    [values, setValues] = useState<Record<string, any>>({}),
    [revision, setRevision] = useState(0),
    [ready, setReady] = useState(false),
    [lookupAttempt, setLookupAttempt] = useState(0),
    [customerQuery, setCustomerQuery] = useState(""),
    [customerMessage, setCustomerMessage] = useState(""),
    [searchBusy, setSearchBusy] = useState(false),
    [verifyNeeded, setVerifyNeeded] = useState(false),
    [boundRecord, setBoundRecord] = useState<any>(record);
  const mounted = useRef(true),
    contract = nativeContracts[action],
    apiRef = useRef(api);
  apiRef.current = api;
  const creditCustomer =
    contract.fields.some((f) => f.name === "customerId") &&
    ["credit.request", "invoice.excess.request"].includes(action);
  useEffect(() => {
    let live = true;
    mounted.current = true;
    setReady(false);
    setLookupError("");
    const names = new Set<string>();
    function visit(fields: NativeField[]) {
      for (const f of fields) {
        if (lookups[f.name]) names.add(f.name);
        if (f.fields) visit(f.fields);
        if (f.item?.fields) visit(f.item.fields);
      }
    }
    visit(contract.fields);
    (async () => {
      const next: any = {};
      for (const name of names) {
        if (name === "customerId" && creditCustomer) {
          next[name] = [];
          continue;
        }
        const [endpoint, path] = lookups[name];
        try {
          const result = await apiRef.current(endpoint);
          next[name] = rawRows(result, path);
        } catch (e: any) {
          next[name] = [];
          if (e.status === 401) {
            if (live) onAuthorityLost();
            return;
          }
          if (e.status !== 403 && live)
            setLookupError(
              "Some choices could not refresh. Retry before submitting.",
            );
        }
      }
      if (live) {
        const target = nativeActionRecordSources[action];
        next.id = target
          ? rawRows(await apiRef.current(target[0]), target[1])
          : action.endsWith(".create") ||
              [
                "product.save",
                "category.save",
                "bulk.meter.register",
                "fleet.vehicle.create",
              ].includes(action)
            ? []
            : rows;
        if (action === "compatibility.review") {
          if (!record?.id) next.id = [];
          else
            next.id = await apiRef.current(
              "compatibility.manage?productId=" + encodeURIComponent(record.id),
            );
        }
        if (action === "setting.rollback")
          next.versionId = record?.key
            ? await apiRef.current(
                "setting.history?key=" +
                  encodeURIComponent(record.key) +
                  "&scope=" +
                  encodeURIComponent(
                    record.scope || user.branchId || user.branch_id || "lagos",
                  ),
              )
            : [];
        setOptions(next);
        setReady(true);
      }
    })().catch((e: any) => {
      if (!live) return;
      setLookupError(e.message || "Current choices could not refresh.");
      setReady(true);
      if (e.status === 401) onAuthorityLost();
    });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [action, user.id, lookupAttempt]);
  useEffect(() => {
    if (!values.id || !options.id?.length) return;
    const chosen = options.id.find(
      (r) => String(idOf(r)) === String(values.id),
    );
    if (!chosen || chosen.id === boundRecord?.id) return;
    setBoundRecord(chosen);
    setValues((v) => ({
      ...v,
      ...(chosen.revision !== undefined ? { revision: chosen.revision } : {}),
      ...(chosen.version !== undefined ? { version: chosen.version } : {}),
    }));
    setRevision((v) => v + 1);
  }, [values.id, options.id]);
  async function findCustomer() {
    if (customerQuery.trim().length < 2) {
      setCustomerMessage(
        "Enter at least two characters of the customer name, email, phone or ID.",
      );
      return;
    }
    setSearchBusy(true);
    try {
      const found = await apiRef.current(
        "credit.customers?q=" + encodeURIComponent(customerQuery.trim()),
      );
      if (!mounted.current) return;
      setOptions((v) => ({ ...v, customerId: found }));
      setCustomerMessage(
        found.length
          ? "Choose the correct customer below."
          : "No eligible customer matches. Try another search.",
      );
      setValues((v) => ({ ...v, customerId: "" }));
      setRevision((v) => v + 1);
    } catch (e: any) {
      if (mounted.current) {
        setCustomerMessage(e.message);
        if ([401, 403].includes(e.status)) onAuthorityLost();
      }
    } finally {
      if (mounted.current) setSearchBusy(false);
    }
  }
  const formFields: any[] = [],
    arrayFields: { path: string; field: NativeField }[] = [],
    optionalGroups: string[] = [];
  function fields(list: NativeField[], prefix = "", object: any = boundRecord) {
    for (const f of list) {
      const path = prefix + f.name;
      if (f.type === "object") {
        if (!f.required) {
          optionalGroups.push(path);
          if (!groups[path]) continue;
        }
        fields(f.fields || [], path + ".", object?.[f.name]);
        continue;
      }
      if (f.type === "array") {
        arrayFields.push({ path, field: f });
        const count =
          counts[path] ??
          object?.[f.name]?.length ??
          (f.required ? Math.max(1, f.min || 0) : 0);
        for (let i = 0; i < count; i++) {
          if (f.item?.type === "object")
            fields(
              f.item.fields || [],
              path + "." + i + ".",
              object?.[f.name]?.[i],
            );
          else
            fields(
              [{ ...f.item!, name: String(i) }],
              path + ".",
              object?.[f.name],
            );
        }
        continue;
      }
      let defaultValue = initialValue(f, object, user);
      if (
        f.name === "id" &&
        nativeActionRecordSources[action] &&
        !options.id?.some((r) => idOf(r) === defaultValue)
      )
        defaultValue = "";
      if (action === "compatibility.review" && f.name === "id")
        defaultValue = "";
      const source =
          f.name === "id" &&
          !nativeActionRecordSources[action] &&
          action !== "compatibility.review"
            ? undefined
            : options[f.name],
        field: any = {
          name: path,
          label:
            (prefix ? words(prefix.replace(/\.$/, "")) + " · " : "") +
            fieldLabel(f.name),
          required: f.required && !f.nullable,
          type:
            f.type === "number"
              ? "number"
              : f.type === "checkbox"
                ? "checkbox"
                : f.type === "json" || (f.max && f.max > 500)
                  ? "textarea"
                  : "text",
          value: values[path] ?? defaultValue,
        };
      if (f.name === "privilege" && record?.privileges)
        field.options = record.privileges.map((p: any) => ({
          value: p.id,
          label: p.label || p.id,
        }));
      else if (f.options?.length)
        field.options = f.options
          .filter(
            (v) =>
              f.name !== "report" ||
              nativeReportsForRole(user.role).includes(String(v)),
          )
          .map((v) => ({
            value: String(v),
            label: words(String(v)),
          }));
      else if (source !== undefined) {
        field.options = [
          {
            value: "",
            label: source.length ? "Choose…" : "No eligible records",
          },
          ...source
            .filter((r) => idOf(r))
            .map((r) => ({ value: String(idOf(r)), label: title(r) })),
        ];
      }
      if (f.type === "json")
        field.label = fieldLabel(f.name) + " (structured value)";
      if (
        (f.name === "version" ||
          f.name === "revision" ||
          (f.name === "id" && record?.id && !action.endsWith(".create"))) &&
        defaultValue !== ""
      )
        field.type = "hidden";
      formFields.push(field);
    }
  }
  fields(contract.fields);
  // Empty arrays are explicit; absent optional groups remain absent even after being removed.
  const buildRequest = (values: any) => {
    const input = { ...values };
    for (const { path } of arrayFields)
      if (
        !(path in input) &&
        !Object.keys(input).some((k) => k.startsWith(path + "."))
      )
        input[path] = [];
    return nativeRequest(action, input);
  };
  function reviewValue(value: any): any {
    if (Array.isArray(value)) return value.map(reviewValue);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => {
        if (/Id$|^id$/.test(key)) {
          const choice = options[key]?.find(
            (r) => String(idOf(r)) === String(v),
          );
          return [
            fieldLabel(key) + " selection",
            choice ? title(choice) : String(v),
          ];
        }
        return [key, reviewValue(v)];
      }),
    );
  }
  const submit = async (_action: string, input: any) => {
    const body = buildRequest(input);
    try {
      return await apiRef.current(action, body);
    } catch (e: any) {
      if (e.code === "REAUTH_REQUIRED") setVerifyNeeded(true);
      if ([401, 403].includes(e.status) && e.code !== "REAUTH_REQUIRED")
        onAuthorityLost();
      throw e;
    }
  };
  if (!ready)
    return (
      <>
        <EasyGasLoader label="Loading current choices" />
        {lookupError && <Copy>{lookupError}</Copy>}
      </>
    );
  return (
    <View style={{ gap: 12 }}>
      {lookupError && (
        <>
          <Text accessibilityRole="alert">{lookupError}</Text>
          <Button
            label="Retry current choices"
            secondary
            onPress={() => setLookupAttempt((n) => n + 1)}
          />
        </>
      )}
      {creditCustomer && (
        <Card>
          <TextInput
            accessibilityLabel="Find customer"
            value={customerQuery}
            onChangeText={setCustomerQuery}
            placeholder="Name, email, phone or customer ID"
          />
          <Button
            label={searchBusy ? "Searching customers…" : "Find customer"}
            secondary
            onPress={() => {
              if (!searchBusy) void findCustomer();
            }}
          />
          {customerMessage && <Copy>{customerMessage}</Copy>}
        </Card>
      )}
      {verifyNeeded && (
        <NativeForm
          api={(a, d) => apiRef.current(a, d)}
          action="reauth"
          title="Verify your identity"
          fields={[
            { name: "password", label: "Current password", type: "password" },
          ]}
          onDone={() => setVerifyNeeded(false)}
        />
      )}
      <Copy>
        Changes follow the existing server review and verification requirements.
      </Copy>
      {optionalGroups.map((path) => (
        <Button
          key={path}
          label={(groups[path] ? "Remove " : "Include ") + fieldLabel(path)}
          secondary
          onPress={() => {
            setGroups((v) => ({ ...v, [path]: !v[path] }));
            setRevision((n) => n + 1);
          }}
        />
      ))}
      {arrayFields.map(({ path, field }) => {
        const count =
          counts[path] ??
          record?.[field.name]?.length ??
          (field.required ? Math.max(1, field.min || 0) : 0);
        return (
          <View key={path} style={{ gap: 8 }}>
            <Copy>
              {fieldLabel(path)} · {count} rows
            </Copy>
            <Button
              label={"Add " + fieldLabel(path) + " row"}
              secondary
              onPress={() => {
                setCounts((c) => ({ ...c, [path]: count + 1 }));
                setRevision((n) => n + 1);
              }}
            />
            {count > 0 && (
              <Button
                label={"Remove last " + fieldLabel(path) + " row"}
                secondary
                onPress={() => {
                  setCounts((c) => ({ ...c, [path]: Math.max(0, count - 1) }));
                  setRevision((n) => n + 1);
                }}
              />
            )}
          </View>
        );
      })}
      <NativeForm
        key={action + revision}
        api={submit}
        action={action}
        title={nativeActionLabels[action] || words(action)}
        fields={formFields}
        onValuesChange={setValues}
        preserveBlankNumbers
        review={(input) => (
          <NativeRecord value={reviewValue(buildRequest(input))} />
        )}
        prepareReview={async (input) => {
          buildRequest(input);
        }}
        reviewKey={action + ":" + (record?.version ?? record?.revision ?? "")}
        reviewLabel="Review change"
        submitLabel="Confirm change"
        disabled={!!lookupError}
        onDone={onDone}
      />
    </View>
  );
}
export default function NativeBusinessWorkspace({
  api,
  user,
  moduleKey,
  scope = {},
  navigate,
}: {
  api: API;
  user: User;
  moduleKey?: string;
  scope?: Record<string, string>;
  navigate: (screen: string) => void;
}) {
  const { colors } = useTheme(),
    apiRef = useRef(api);
  apiRef.current = api;
  const [currentTab, setCurrentTab] = useState(""),
    [data, setData] = useState<any>(null),
    [allowed, setAllowed] = useState<string[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<any>(null),
    [action, setAction] = useState<string | null>(null),
    [reauth, setReauth] = useState(false),
    [actionPicker, setActionPicker] = useState(false),
    [reportSheet, setReportSheet] = useState(false),
    [report, setReport] = useState<any>(null),
    [exportBusy, setExportBusy] = useState(false),
    [filters, setFilters] = useState<Record<string, any>>({}),
    [filtersOpen, setFiltersOpen] = useState(false),
    [cataloguePreview, setCataloguePreview] = useState(false),
    [reportKind, setReportKind] = useState("deliveries"),
    [reportChoices, setReportChoices] = useState<any>(null);
  const generation = useRef(0),
    alive = useRef(true),
    work = nativeWorkspaces[moduleKey || ""],
    tab =
      currentTab && work?.reads[currentTab]
        ? currentTab
        : Object.keys(work?.reads || {})[0],
    session = useRef(new NativeWorkspaceSession(api, user.id, user.role));
  session.current.setApi(api);
  useEffect(() => {
    if (!reportSheet) return;
    let live = true;
    apiRef
      .current("catalogue?view=homepage")
      .then((r) => {
        if (live) setReportChoices(r);
      })
      .catch(() => {
        if (live) setReportChoices(null);
      });
    return () => {
      live = false;
    };
  }, [reportSheet]);
  const clear = useCallback(() => {
    generation.current++;
    setAllowed([]);
    setData(null);
    setSelected(null);
    setAction(null);
    setReport(null);
    setBusy(false);
    setError("Your access changed. Return to your account and sign in again.");
  }, []);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const nav = await apiRef.current("navigation");
      if (nav.user?.id !== user.id || nav.user?.role !== user.role)
        throw Object.assign(Error("Your staff session changed."), {
          status: 403,
        });
      const permissions = nav.allowed || [];
      if (
        work &&
        (!work.roles.includes(user.role) || !permissions.includes(work.access))
      )
        throw Object.assign(
          Error("This workspace is no longer available to your account."),
          { status: 403 },
        );
      if (request !== generation.current || !alive.current) return;
      setAllowed(permissions);
      if (work) {
        let endpoint = work.reads[tab];
        const params = new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v !== "" && v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        );
        if (endpoint.startsWith("inventory.workspace")) {
          params.set("page", String(page));
          if (query) params.set("q", query);
          if (scope.branchId) params.set("branchId", scope.branchId);
        } else if (endpoint === "inventory.movements") {
          params.set("page", String(page));
          if (query) params.set("q", query);
          if (scope.branchId) params.set("branchId", scope.branchId);
        } else if (endpoint.startsWith("approvals?")) {
          params.set("page", String(page));
          if (query) params.set("q", query);
        } else if (endpoint.startsWith("credits?")) {
          params.set("page", String(page));
          if (query) params.set("q", query);
        } else if (endpoint === "testimonials.manage") {
          params.set("page", String(page - 1));
        } else if (endpoint.startsWith("incidents?")) {
          params.set("page", String(page));
          if (query) params.set("q", query);
        } else if (endpoint === "settings")
          params.set(
            "scope",
            scope.branchId || user.branchId || user.branch_id || "lagos",
          );
        else if (endpoint === "business.snapshot")
          for (const k of ["branchId", "from", "to"])
            if (scope[k]) params.set(k, scope[k]);
        if (params.size)
          endpoint += (endpoint.includes("?") ? "&" : "?") + params;
        const result = await apiRef.current(endpoint);
        if (request === generation.current && alive.current) {
          setData(result);
          session.current.confirmReadback();
        }
      } else setData(null);
    } catch (e: any) {
      if (request !== generation.current || !alive.current) return;
      if ([401, 403].includes(e.status)) clear();
      else {
        setData(null);
        setError(e.message || "Could not refresh this workspace.");
      }
    } finally {
      if (request === generation.current && alive.current) setBusy(false);
    }
  }, [
    moduleKey,
    tab,
    user.id,
    user.role,
    page,
    query,
    JSON.stringify(scope),
    JSON.stringify(filters),
  ]);
  useEffect(() => {
    alive.current = true;
    setSelected(null);
    setAction(null);
    setReport(null);
    setData(null);
    setCurrentTab("");
    setPage(1);
    return () => {
      alive.current = false;
      generation.current++;
      session.current.dispose();
    };
  }, [moduleKey, user.id]);
  useEffect(() => {
    void load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => subscription.remove();
  }, [load]);
  const guardedAPI = useCallback(
    async (endpoint: string, input?: any) => {
      if (input === undefined || endpoint === "reauth")
        return apiRef.current(endpoint, input);
      try {
        return await session.current.submit(moduleKey!, endpoint, input);
      } catch (e: any) {
        if ([401, 403].includes(e.status) && e.code !== "REAUTH_REQUIRED")
          clear();
        throw e;
      }
    },
    [moduleKey, clear],
  );
  const allRows = nativeWorkspaceRows(tab, data),
    rows = allRows.filter(
      (r) =>
        !query || JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
    ),
    actions = workspaceActions(moduleKey || "", user.role),
    total = Number(data?.total || data?.filteredTotal || rows.length),
    pages = Number(
      data?.totalPages ||
        data?.pages ||
        Math.ceil(total / Number(data?.pageSize || data?.limit || 20)) ||
        1,
    );
  async function openAction(name: string) {
    setActionPicker(false);
    setError("");
    setFeedback("");
    if (
      ["setting.propose", "setting.rollback"].includes(name) &&
      !selected?.key
    ) {
      setError(
        "Open a record in Business controls or Policies before choosing this action.",
      );
      return;
    }
    if (name === "staff.privileges.save" && !selected?.id) {
      setError(
        "Open a staff record before changing its individual privileges.",
      );
      return;
    }

    if (name === "setting.propose" && selected?.key) {
      try {
        const settings = await apiRef.current(
          "settings?scope=" +
            encodeURIComponent(
              scope.branchId || user.branchId || user.branch_id || "lagos",
            ),
        );
        const record = settings.find((r: any) => r.key === selected.key);
        if (!record) throw Error("Current control not available.");
        setSelected(record);
      } catch (e: any) {
        setError(e.message);
        return;
      }
    }
    if (name === "staff.privileges.save" && selected?.id) {
      try {
        const source = await apiRef.current(
          "staff.privileges?userId=" + encodeURIComponent(selected.id),
        );
        setSelected({
          ...selected,
          version: source.version,
          privileges: source.privileges,
        });
      } catch (e: any) {
        setError(e.message);
        return;
      }
    }
    setAction(name);
  }
  async function runReport(_a: string, values: any) {
    const input = nativeReportRequest(values, scope);
    const next = await apiRef.current("business.report", input);
    setReport(next);
    return next;
  }
  async function exportReport(format: "csv" | "excel" | "print") {
    if (exportBusy || !report) return;
    setExportBusy(true);
    try {
      const r = await apiRef.current("business.export", {
          ...report.filters,
          report: report.report,
          format,
        }),
        columns = Object.keys(r.rows[0] || {});
      if (!columns.length) throw Error("No rows to export for this scope.");
      const escape = (v: any) =>
        String(v ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c]!,
        );
      if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
        throw Error("File sharing is unavailable on this device.");
      let uri = "";
      try {
        if (format === "print") {
          const html =
            "<html><body><h1>EasyGas · " +
            escape(report.report) +
            "</h1><p>" +
            escape(JSON.stringify(r.filters)) +
            "</p><table><tr>" +
            columns.map((c) => "<th>" + escape(c) + "</th>").join("") +
            "</tr>" +
            r.rows
              .map(
                (row: any) =>
                  "<tr>" +
                  columns
                    .map((c) => "<td>" + escape(row[c]) + "</td>")
                    .join("") +
                  "</tr>",
              )
              .join("") +
            "</table></body></html>";
          uri = (await Print.printToFileAsync({ html })).uri;
        } else {
          uri =
            FileSystem.cacheDirectory +
            "easygas-report-" +
            Date.now() +
            (format === "csv" ? ".csv" : ".xml");
          const content =
            format === "csv"
              ? gasReportCsv([
                  columns,
                  ...r.rows.map((row: any) => columns.map((c) => row[c])),
                ])
              : '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>' +
                [
                  columns,
                  ...r.rows.map((row: any) => columns.map((c) => row[c])),
                ]
                  .map(
                    (row) =>
                      "<Row>" +
                      row
                        .map(
                          (v: any) =>
                            '<Cell><Data ss:Type="String">' +
                            escape(v) +
                            "</Data></Cell>",
                        )
                        .join("") +
                      "</Row>",
                  )
                  .join("") +
                "</Table></Worksheet></Workbook>";
          await FileSystem.writeAsStringAsync(uri, content);
        }
        await Sharing.shareAsync(uri, {
          mimeType:
            format === "csv"
              ? "text/csv"
              : format === "excel"
                ? "application/xml"
                : "application/pdf",
        });
      } finally {
        if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExportBusy(false);
    }
  }
  const filterAction = (work?.reads[tab] || "").split("?")[0];
  const filterFields = (nativeContracts[filterAction]?.fields || [])
    .filter(
      (f) =>
        !["view", "page", "pageSize", "limit", "q", "search"].includes(f.name),
    )
    .map((f) => ({
      name: f.name,
      label: fieldLabel(f.name),
      required: false,
      type: (f.type === "number" ? "number" : "text") as "number" | "text",
      value: filters[f.name] ?? f.value ?? "",
      ...(f.options
        ? {
            options: [
              { value: "", label: "All" },
              ...f.options.map((v) => ({
                value: String(v),
                label: words(String(v)),
              })),
            ],
          }
        : {}),
    }));
  async function applyFilters(_a: string, input: any) {
    const next = nativeRequest(filterAction, input);
    const base = work.reads[tab],
      params = new URLSearchParams(
        Object.entries(next).map(([k, v]) => [k, String(v)]),
      );
    if (query) params.set("q", query);
    if (filterAction === "testimonials.manage") params.set("page", "0");
    const result = await apiRef.current(
      base + (base.includes("?") ? "&" : "?") + params,
    );
    setFilters(next);
    setPage(1);
    setData(result);
    setFiltersOpen(false);
    return { message: "Filters applied." };
  }
  async function exportWorkspace() {
    if (exportBusy) return;
    setExportBusy(true);
    let uri = "";
    try {
      const endpoint =
          moduleKey === "inventory"
            ? "inventory.export"
            : moduleKey === "testimonials"
              ? "testimonials.export"
              : "rewards.export",
        params = new URLSearchParams(
          Object.entries(filters).map(([k, v]) => [k, String(v)]),
        );
      if (query) params.set("q", query);
      if (scope.branchId && moduleKey !== "testimonials")
        params.set("branchId", scope.branchId);
      const result =
        endpoint === "rewards.export"
          ? await apiRef.current(
              endpoint,
              scope.branchId ? { branchId: scope.branchId } : {},
            )
          : await apiRef.current(endpoint + (params.size ? "?" + params : ""));
      let csv = result.csv;
      if (!csv) {
        const list = moduleKey === "rewards" ? result.ledger : result.rows,
          columns =
            moduleKey === "testimonials"
              ? [
                  "display_name",
                  "rating",
                  "body",
                  "status",
                  "consent",
                  "created_at",
                ]
              : Object.keys(list[0] || {});
        csv = gasReportCsv([
          columns,
          ...list.map((r: any) => columns.map((c: string) => r[c])),
        ]);
      }
      if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
        throw Error("File sharing is unavailable on this device.");
      uri =
        FileSystem.cacheDirectory +
        "easygas-" +
        moduleKey +
        "-" +
        Date.now() +
        ".csv";
      await FileSystem.writeAsStringAsync(uri, csv);
      await Sharing.shareAsync(uri, { mimeType: "text/csv" });
    } catch (e: any) {
      if ([401, 403].includes(e.status) && e.code !== "REAUTH_REQUIRED")
        clear();
      setError(e.message);
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
      setExportBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      <Title>{work?.title || "Workspaces"}</Title>
      <Copy>
        Current server records · permissions follow your signed-in account.
      </Copy>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Button label="Refresh records" secondary onPress={() => void load()} />
        {work && (
          <Button
            label="All workspaces"
            secondary
            onPress={() => navigate("native-workspaces")}
          />
        )}
        <Button
          label="Verify identity"
          secondary
          onPress={() => setReauth(true)}
        />
      </View>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {feedback && <Text accessibilityRole="status">{feedback}</Text>}
      {busy && <EasyGasLoader label="Loading workspace" />}
      {!work &&
        !busy &&
        visibleWorkspaces(user.role, allowed).map(([key, w]) => (
          <Button
            key={key}
            label={w.title}
            secondary
            onPress={() => navigate("workspace:" + key)}
          />
        ))}
      {work && allowed.includes(work.access) && (
        <>
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {Object.keys(work.reads).map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityLabel={t}
                accessibilityState={{ selected: tab === t }}
                onPress={() => {
                  setCurrentTab(t);
                  setPage(1);
                  setSelected(null);
                }}
                style={{
                  padding: 12,
                  borderRadius: 20,
                  backgroundColor: tab === t ? colors.button : colors.surface,
                }}
              >
                <Text
                  style={{ color: tab === t ? colors.onButton : colors.text }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            accessibilityLabel={"Search " + work.title}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search records…"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 12,
            }}
          />
          {moduleKey === "products" && user.role === "owner" && (
            <Button
              label="Product import preview"
              secondary
              onPress={() => setCataloguePreview(true)}
            />
          )}
          {filterFields.length > 0 && (
            <Button
              label="Filters"
              secondary
              onPress={() => setFiltersOpen(true)}
            />
          )}
          {["inventory", "testimonials", "rewards"].includes(
            moduleKey || "",
          ) && (
            <Button
              label={exportBusy ? "Preparing export…" : "Export filtered CSV"}
              secondary
              onPress={() => void exportWorkspace()}
            />
          )}
          {moduleKey === "reports" && (
            <Button
              label="Generate report"
              onPress={() => {
                setReportKind("deliveries");
                setReportSheet(true);
              }}
            />
          )}
          {actions.length > 0 && (
            <Button label="Actions" onPress={() => setActionPicker(true)} />
          )}
          {rows.length
            ? rows.map((r: any, i: number) => (
                <Pressable
                  key={r.id || r.key || i}
                  accessibilityRole="button"
                  accessibilityLabel={"View " + title(r)}
                  onPress={() => setSelected(r)}
                >
                  <Card>
                    <Text style={{ fontWeight: "700", fontSize: 16 }}>
                      {title(r)}
                    </Text>
                    <Copy>
                      {words(
                        String(r.status || r.state || r.kind || r.role || ""),
                      )}
                      {r.version != null ? " · Revision " + r.version : ""}
                    </Copy>
                    {r.available != null && (
                      <Copy>{r.available} available</Copy>
                    )}
                  </Card>
                </Pressable>
              ))
            : !busy &&
              !error && (
                <Card>
                  <Title>No matching records</Title>
                  <Copy>
                    Adjust your filters or start an authorised action.
                  </Copy>
                </Card>
              )}
          {tab === "Analytics" && data && !busy && (
            <NativeRecord value={data} />
          )}
          <Copy>
            {total} records{pages > 1 ? " · Page " + page + " of " + pages : ""}
          </Copy>
          {pages > 1 && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              {page > 1 && (
                <Button
                  label="Previous page"
                  secondary
                  onPress={() => setPage((p) => p - 1)}
                />
              )}{" "}
              {page < pages && (
                <Button
                  label="Next page"
                  secondary
                  onPress={() => setPage((p) => p + 1)}
                />
              )}
            </View>
          )}
          {report && (
            <Card>
              <Title>{report.report} report</Title>
              <NativeRecord
                value={{
                  filters: report.filters,
                  ignoredFilters: report.ignoredFilters,
                  summary: report.summary,
                }}
              />
              <Copy>{report.rows.length} report rows</Copy>
              <NativeRecord value={report.rows} />
              <Button
                label="Share CSV"
                secondary
                onPress={() => void exportReport("csv")}
              />
              <Button
                label="Share Excel XML"
                secondary
                onPress={() => void exportReport("excel")}
              />
              <Button
                label="Share PDF"
                secondary
                onPress={() => void exportReport("print")}
              />
            </Card>
          )}
        </>
      )}
      {cataloguePreview && (
        <ContextSheet
          title="Product import preview"
          onClose={() => setCataloguePreview(false)}
        >
          <NativeCataloguePreview products={allRows} />
        </ContextSheet>
      )}
      {filtersOpen && (
        <ContextSheet
          title="Filter records"
          onClose={() => setFiltersOpen(false)}
        >
          <NativeForm
            api={applyFilters}
            action={filterAction}
            title="Filters"
            fields={filterFields}
            preserveBlankNumbers
            submitLabel="Apply filters"
            onDone={() => setFiltersOpen(false)}
          />
          <Button
            label="Clear filters"
            secondary
            onPress={() => {
              setFilters({});
              setPage(1);
              setFiltersOpen(false);
            }}
          />
        </ContextSheet>
      )}
      {selected && !action && !actionPicker && (
        <ContextSheet title={title(selected)} onClose={() => setSelected(null)}>
          <NativeRecord value={selected} />
          {work?.destination && (
            <Button
              label="Open appointment workflow"
              onPress={() => {
                setSelected(null);
                navigate(work.destination!);
              }}
            />
          )}
          {actions.length > 0 && (
            <Button
              label="Actions for this record"
              onPress={() => setActionPicker(true)}
            />
          )}
        </ContextSheet>
      )}
      {actionPicker && (
        <ContextSheet
          title="Workspace actions"
          onClose={() => setActionPicker(false)}
        >
          <View style={{ gap: 10 }}>
            {actions.map((a) => (
              <Button
                key={a}
                label={nativeActionLabels[a] || words(a)}
                secondary
                onPress={() => void openAction(a)}
              />
            ))}
          </View>
        </ContextSheet>
      )}
      {action && (
        <ContextSheet
          title={nativeActionLabels[action] || words(action)}
          onClose={() => setAction(null)}
        >
          <NativeContractForm
            key={action + selected?.id}
            api={guardedAPI}
            action={action}
            record={selected}
            user={user}
            rows={allRows}
            onAuthorityLost={clear}
            onDone={(result) => {
              setFeedback(
                result.message ||
                  "Server confirmed. Refreshing the current records.",
              );
              setAction(null);
              setSelected(null);
              void load();
            }}
          />
        </ContextSheet>
      )}
      {reauth && (
        <ContextSheet
          title="Verify your identity"
          onClose={() => setReauth(false)}
        >
          <NativeForm
            api={api}
            action="reauth"
            title="Confirm your password"
            fields={[
              { name: "password", label: "Current password", type: "password" },
            ]}
            onDone={() => {
              setReauth(false);
              setFeedback(
                "Identity verified. Review the current record before continuing.",
              );
              void load();
            }}
          />
        </ContextSheet>
      )}
      {reportSheet && (
        <ContextSheet
          title="Generate report"
          onClose={() => setReportSheet(false)}
        >
          <NativeForm
            api={runReport}
            action="business.report"
            title="Report scope"
            onValuesChange={(v) => setReportKind(v.report || "deliveries")}
            fields={[
              {
                name: "report",
                label: "Report",
                value: "deliveries",
                options: nativeReportsForRole(user.role).map((value) => ({
                  value,
                  label: words(value),
                })),
              },
              ...nativeReportFilterKeys(reportKind).map((name) => ({
                name,
                label: (
                  {
                    branchId: "Branch",
                    from: "From (YYYY-MM-DD)",
                    to: "To (YYYY-MM-DD)",
                    category: "Product category",
                    locationId: "Delivery area",
                    customerCategory: "Customer category",
                    orderStatus: "Order status",
                    paymentStatus: "Payment status",
                  } as Record<string, string>
                )[name],
                required: false,
                value: scope[name] || "",
                ...([
                  "branchId",
                  "locationId",
                  "category",
                  "customerCategory",
                  "orderStatus",
                  "paymentStatus",
                ].includes(name)
                  ? {
                      options: [
                        { value: "", label: "All" },
                        ...(name === "branchId"
                          ? (data?.branches || []).map((r: any) => ({
                              value: r.id,
                              label: r.name,
                            }))
                          : name === "locationId"
                            ? (reportChoices?.gas?.locations || []).map(
                                (r: any) => ({ value: r.id, label: r.name }),
                              )
                            : name === "category"
                              ? (reportChoices?.categories || []).map(
                                  (v: string) => ({ value: v, label: v }),
                                )
                              : (name === "customerCategory"
                                  ? ["customer", "commercial"]
                                  : name === "orderStatus"
                                    ? [
                                        "placed",
                                        "accepted",
                                        "preparing",
                                        "assigned",
                                        "out_for_delivery",
                                        "delivered",
                                        "failed",
                                        "cancelled",
                                      ]
                                    : [
                                        "unpaid",
                                        "collected",
                                        "verified",
                                        "refunded",
                                      ]
                                ).map((value) => ({
                                  value,
                                  label: words(value),
                                }))),
                      ],
                    }
                  : {}),
              })),
            ]}
            onDone={() => setReportSheet(false)}
          />
        </ContextSheet>
      )}
    </View>
  );
}
