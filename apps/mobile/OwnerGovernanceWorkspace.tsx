import { staffRoleLabel } from "../../packages/business-rules/src/staff-roles";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import { EasyGasLoader } from "./EasyGasLoader";

type API = (action: string, data?: any) => Promise<any>;
type Props = {
  user: { id: string; role: string; branchId?: string; branch_id?: string; name?: string };
  screen: string;
  api: API;
  navigate: (screen: string) => void;
};
const sections = [
  { key: "owner-report-library", label: "Reports & Analytics", code: "OWN-008", access: "reports" },
  { key: "owner-controls", label: "Business Controls", code: "OWN-005", access: "settings" },
  { key: "owner-branches", label: "Branch Performance", code: "OWN-006", access: "reports" },
  { key: "owner-organisation", label: "Organisation Profile", code: "OWN-009", access: "settings" },
  { key: "owner-staff", label: "Roles & Access", code: "OWN-010", access: "staff" },
  { key: "owner-audit", label: "Audit History", code: "OWN-011", access: "audit" },
] as const;
export function isOwnerGovernanceScreen(screen: string) {
  return screen === "owner-governance" || sections.some(section => section.key === screen);
}
const reportKinds = ["branches", "sales", "deliveries", "services", "movements", "expenses", "profit", "payments"] as const;
function lagosPeriod() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return { from: `${today.slice(0, 7)}-01`, to: today };
}
function safeString(value: unknown): string {
  if (value === null || value === undefined) return "Unavailable";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-NG") : "Unavailable";
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "View original record";
}
function sensitive(key: string) { return /secret|token|password|credential|private[_-]?key|api[_-]?key/i.test(key); }
function readableError(error: any) { return typeof error?.message === "string" ? error.message : "Could not load this information. Please retry."; }

/** Read access is determined afresh by the existing navigation API. Mutations retain existing server controls. */
export default function OwnerGovernanceWorkspace({ user, screen, api, navigate }: Props) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const { colors, dark } = useTheme();
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [staff, setStaff] = useState<any>(null);
  const [privileges, setPrivileges] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const privilegeRequest = useRef(0);
  const [page, setPage] = useState(1);
  const auditNext = useRef<{ page: number; snapshot: string; cursor: string } | null>(null);
  const [report, setReport] = useState<typeof reportKinds[number]>("branches");
  const [message, setMessage] = useState("");
  const { from, to } = useMemo(lagosPeriod, []);
  const authorised = user.role === "owner" || (user.role === "finance" && screen === "owner-audit");
  const relevant = sections.find((x) => x.key === screen);
  const required = relevant?.access ?? "dashboard";
  const can = (section: string) => allowed?.includes(section) ?? false;
  const surface = dark ? "#153726" : "#ffffff";
  const foreground = colors.text;
  const border = colors.border;
  const secondary = colors.muted;
  const show = (name: string, value: unknown) => (
    <View key={name} style={[styles.row, { borderBottomColor: border }]}>
      <Text style={{ color: secondary, flex: 1 }}>{name}</Text>
      <Text style={{ color: foreground, fontWeight: "700", flex: 1, textAlign: "right" }}>{safeString(value)}</Text>
    </View>
  );
  const panel = (children: React.ReactNode, label?: string) => (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      {label ? <Text style={[styles.title, { color: foreground }]}>{label}</Text> : null}
      {children}
    </View>
  );
  const action = (label: string, destination: string) => (
    <Pressable key={destination} accessibilityRole="button" style={[styles.link, { borderColor: border }]} onPress={() => navigate(destination)}>
      <Text style={{ fontWeight: "700", color: foreground }}>{label}</Text><Text style={{ color: colors.primary }}>›</Text>
    </Pressable>
  );
  const refresh = () => { setData(null); setError(""); setReload((v) => v + 1); };

  useEffect(() => {
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") setReload(value => value + 1);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    let active = true;
    privilegeRequest.current++;
    setData(null); setPrivileges(null); setStaff(null); setError(""); setMessage("");
    if (!authorised) return;
    (async () => {
      try {
        const nav = await apiRef.current("navigation.access");
        if (!active) return;
        if (nav.user?.id !== user.id || nav.user?.role !== user.role) {
          setAllowed([]);
          setError("Your staff access has changed. Sign in again to refresh your workspace.");
          return;
        }
        const permissions: string[] = Array.isArray(nav.allowed) ? nav.allowed : [];
        setAllowed(permissions);
        if (!permissions.includes(required)) { setError("You no longer have permission to view this workspace."); return; }
        let response: any;
        if (screen === "owner-controls" || screen === "owner-organisation") response = await apiRef.current(`settings?scope=${encodeURIComponent(user.branchId ?? user.branch_id ?? "lagos")}`);
        else if (screen === "owner-staff") response = await apiRef.current("staff.manage");
        else if (screen === "owner-audit") {
          const params = new URLSearchParams({ view: "paged", page: String(page), pageSize: "25", q: auditQuery });
          if (page > 1 && auditNext.current?.page === page) {
            params.set("snapshot", auditNext.current.snapshot);
            params.set("cursor", auditNext.current.cursor);
            params.set("direction", "older");
          }
          response = await apiRef.current(`audit?${params}`);
          if (active && response.lastCursor) auditNext.current = { page: page + 1, snapshot: response.snapshot, cursor: response.lastCursor };
        }
        else if (screen === "owner-report-library" || screen === "owner-branches") response = await apiRef.current("business.report", { report: screen === "owner-branches" ? "branches" : report, from, to });
        else response = {};
        if (active) setData(response);
      } catch (e: any) { if (active) { setAllowed(null); setError(readableError(e)); } }
    })();
    return () => { active = false; };
  }, [user.id, user.role, user.branchId, user.branch_id, screen, reload, page, report, auditQuery, required, from, to, authorised]);

  async function readPrivileges(person: any) {
    const request = ++privilegeRequest.current;
    setStaff(person); setPrivileges(null); setMessage("");
    try { const p = await apiRef.current(`staff.privileges?userId=${encodeURIComponent(person.id)}`); if (request === privilegeRequest.current) setPrivileges(p); }
    catch (e: any) { if (request === privilegeRequest.current) { setPrivileges(false); setMessage(readableError(e)); } }
  }

  if (!authorised) return <Text accessibilityRole="alert">Your staff role does not have access to this workspace.</Text>;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>EASYGAS · BUSINESS OWNER</Text>
      <Text style={[styles.heading, { color: foreground }]}>{relevant?.label ?? "Management & Governance"}</Text>

      {allowed === null && !error ? <EasyGasLoader color={colors.primary} /> : null}
      {error ? panel(<><Text accessibilityRole="alert" style={{ color: foreground }}>{error}</Text><Pressable onPress={refresh} style={styles.primary}><Text style={styles.primaryText}>Retry</Text></Pressable></>) : null}
      {allowed !== null && !error && !can(required) ? panel(<Text style={{ color: foreground }}>This screen is unavailable for your current access.</Text>) : null}
      {allowed !== null && !error && can(required) && !data ? <EasyGasLoader color={colors.primary} /> : null}
      {message ? panel(<Text accessibilityRole="alert" style={{ color: foreground }}>{message}</Text>) : null}
      {data && can(required) && (screen === "owner-controls" || screen === "owner-organisation") ? <>
        {Array.isArray(data) ? data.filter((r: any) => screen === "owner-controls" || /business|organisation|organization|profile|contact|brand|legal|registration|tax/i.test(`${r.category} ${r.key} ${r.label}`)).map((r: any) => panel(<>
          <Text style={{color:foreground,fontWeight:"700"}}>{safeString(r.label)}</Text><Text style={{color:secondary}}>{safeString(r.category)}</Text>
          <Text style={{color:foreground}}>{sensitive(String(r.key)) ? "Restricted setting — value hidden" : safeString(r.value)}</Text>
          <Text style={{color:secondary}}>Protected changes use the existing governed approval workflow.</Text>
        </>, String(r.key))) : null}
        {Array.isArray(data) && !data.length ? panel(<Text style={{color:secondary}}>No authorised business settings were returned.</Text>) : null}
      </> : null}
      {data && can(required) && (screen === "owner-branches" || screen === "owner-report-library") ? <>
        {screen === "owner-report-library" ? panel(<>
          <Text style={{color:foreground}}>Select a report</Text>
          <View style={styles.pills}>{reportKinds.map((k) => <Pressable key={k} onPress={() => setReport(k)} style={[styles.pill,{backgroundColor:report===k?colors.primary:surface,borderColor:border}]}><Text style={{color:report===k?"#fff":foreground}}>{k.replaceAll("_"," ")}</Text></Pressable>)}</View>
        </>,"Reports") : null}
        <Text style={{color:secondary,marginBottom:10}}>Report basis: {screen==="owner-branches"?"branches":report}. Dates and filters use actual recorded transactions.</Text>
        {(data.rows ?? []).slice(0,50).map((r:any,i:number) => panel(<>{Object.entries(r).slice(0,6).map(([k,v]) => show(k.replaceAll("_"," "),sensitive(k)?"Restricted":v))}</>, `Record ${i+1}`))}
        {!data.rows?.length ? panel(<Text style={{color:secondary}}>No records for this report period.</Text>) : null}
      </> : null}
      {data && can(required) && screen === "owner-staff" ? <>
        {staff ? panel(<>
          <Pressable onPress={()=>{privilegeRequest.current++;setStaff(null);setPrivileges(null);}}><Text style={{color:colors.primary}}>‹ Staff directory</Text></Pressable>
          {show("Staff member",staff.name)}{show("Role",staffRoleLabel(staff.role))}{show("Branch",staff.branch_id)}{show("Status",staff.active?"Active":"Suspended")}
          {privileges ? (privileges.privileges??[]).map((p:any)=>show(p.label, p.effective ? "Allowed" : "Denied")) : <Text style={{color:secondary}}>{privileges === false ? "Privileges unavailable." : "Loading effective privileges…"}</Text>}
          <Text style={{color:secondary}}>Permission changes require existing protected approval workflows. This mobile view cannot grant privileges directly.</Text>
        </>,"Role & privileges") : <>
          {show("Staff accounts",data.people?.length)}
          {(data.people??[]).slice(0,100).map((p:any) => <Pressable key={p.id} style={[styles.card,{backgroundColor:surface,borderColor:border}]} onPress={()=>readPrivileges(p)} accessibilityRole="button"><Text style={{color:foreground,fontWeight:"700"}}>{safeString(p.name)}</Text><Text style={{color:secondary}}>{staffRoleLabel(p.role)} · {safeString(p.branch_id)}</Text><Text style={{color:colors.primary}}>View effective access ›</Text></Pressable>)}
        </>}
      </> : null}
      {can(required) && screen === "owner-audit" ? panel(<>
        <TextInput accessibilityLabel="Search audit history" placeholder="Search action, actor or target" placeholderTextColor={secondary}
          value={search} maxLength={200} onChangeText={setSearch} returnKeyType="search"
          onSubmitEditing={() => { auditNext.current = null; setPage(1); setAuditQuery(search.trim()); }}
          style={[styles.input, { borderColor: border, color: foreground }]} />
      </>, "Audit history") : null}
      {data && can(required) && screen === "owner-audit" ? <>
        {show("Records",data.total)}{show("Page",data.page)}
        {(data.rows??[]).map((r:any)=>panel(<>{show("Action",r.action)}{show("Actor",r.actor)}{show("Outcome",r.outcome)}{show("Target",r.target)}{show("Lagos timestamp",r.created_at)}</>,String(r.id)))}
        {!data.rows?.length ? panel(<Text style={{color:secondary}}>No audit events match this filter.</Text>) : null}
        {page>1 ? <Pressable accessibilityRole="button" style={[styles.link,{borderColor:border}]} onPress={()=>{auditNext.current=null;setPage(1);}}><Text style={{color:colors.primary}}>First page</Text></Pressable> : null}
        {data.lastCursor && data.page < data.totalPages ? <Pressable style={styles.primary} onPress={()=>setPage(v=>v+1)}><Text style={styles.primaryText}>Next page</Text></Pressable> : null}
      </> : null}
      {screen === "owner-governance" && allowed !== null && !error ? sections.filter((s) => can(s.access)).map((s) => action(s.label,s.key)) : null}
      {data && screen !== "owner-governance" ? <Pressable onPress={refresh} style={[styles.link,{borderColor:border}]}><Text style={{color:colors.primary}}>Refresh from server</Text></Pressable> : null}
    </View>
  );
}
const styles=StyleSheet.create({
  wrap:{width:"100%",paddingBottom:16,gap:10}, eyebrow:{fontSize:12,fontWeight:"800",letterSpacing:1},heading:{fontSize:25,fontWeight:"800"},
  title:{fontSize:17,fontWeight:"800",marginBottom:8},card:{borderWidth:1,borderRadius:16,padding:15,gap:5},
  row:{flexDirection:"row",borderBottomWidth:1,paddingVertical:8,gap:8},link:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",minHeight:48,borderWidth:1,borderRadius:12,paddingHorizontal:14,paddingVertical:12},
  input:{borderWidth:1,borderRadius:10,padding:12,minHeight:48,marginVertical:8,fontSize:16},
  primary:{minHeight:48,borderRadius:12,backgroundColor:"#076B35",alignItems:"center",justifyContent:"center",marginVertical:5,padding:10},primaryText:{color:"white",fontWeight:"800"},
  pills:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:8},pill:{borderWidth:1,borderRadius:100,paddingHorizontal:12,paddingVertical:9},
});
