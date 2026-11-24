import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { withAuthDeadline } from "../packages/business-rules/src/auth-request";
import { safeCustomerReturn } from "../packages/business-rules/src/customer-navigation";

const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"),
  { act, create } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await mkdtemp(path.join(os.tmpdir(), "easygas-auth-ui-"));
after(() => rm(temp, { recursive: true, force: true }));
const webSource = await readFile("apps/web/components/site.tsx", "utf8");
const auth = webSource.slice(
  webSource.indexOf("function Auth("),
  webSource.indexOf("function Cart("),
);
const sessionEffect = webSource.slice(webSource.indexOf("  useEffect(() => {\n    let controller: AbortController | null = null"), webSource.indexOf("  async function signOut()"));
const nativeSource = await readFile("apps/mobile/App.tsx", "utf8");
const nativeBootstrap = nativeSource.slice(nativeSource.indexOf("  useEffect(() => {\n    (async () => {\n      try {\n        let savedCart"), nativeSource.indexOf("  useEffect(() => {\n    if (hydrated)"));
await writeFile(
  path.join(temp, "web.tsx"),
  `
import React,{useState,useEffect,useRef} from 'react';
import {safeCustomerReturn,customerAuthHref} from '${path.resolve("packages/business-rules/src/customer-navigation")}';
import {AuthShell,AuthField} from '${path.resolve("apps/web/components/auth-presentation")}';
import {AccountLinkEntry} from '${path.resolve("apps/web/components/auth-link-entry")}';
const PASSWORD_MIN_LENGTH=8;
const UserRound=()=>null,ArrowRight=()=>null;
const Notice=({message,type})=><div role={type==='error'?'alert':'status'}>{message}</div>;
const Link=({children,...p})=><a {...p}>{children}</a>;
const useShop=()=>globalThis.authTest.shop;
const useRouter=()=>globalThis.authTest.router;
const useSearchParams=()=>new URLSearchParams(globalThis.authTest.search);
const api=(...a)=>globalThis.authTest.api(...a),authRequest=api;
const analyticsNavigate=(r,p)=>r.push(p);
${auth}
export {Auth};
const SecureStore={getItemAsync:(key)=>globalThis.authTest.storage(key)};
export function NativeBootstrapHarness(){
 const [cart,setCart]=useState([]),[token,setToken]=useState(null),[user,setUser]=useState(null),[catalogue,setCatalogue]=useState(null),[error,setError]=useState(''),[hydrated,setHydrated]=useState(false),[loading,setLoading]=useState(true);
 ${nativeBootstrap}
 return <div ready={hydrated} user={user} cart={cart} catalogue={catalogue} error={error}/>;
}
export function SessionHarness({pathname='/login',protectedPath=false,initialUser=null}){
 const [user,setUser]=useState(initialUser),[authSessionCheck,setAuthSessionCheck]=useState(initialUser?'complete':'pending');const signingOut=useRef(false);
 ${sessionEffect}
 return <div sessionState={authSessionCheck} sessionUser={user}/>;
}`,
);
const stub = path.join(temp, "native-stub.tsx");
await writeFile(
  stub,
  `
import React from 'react';
const host=(t)=>React.forwardRef((p,r)=>React.createElement(t,{...p,ref:r},p.children));
export const View=host('View'),Text=host('Text'),TextInput=host('TextInput'),Image=host('Image'),Pressable=host('Pressable'),ScrollView=host('ScrollView'),KeyboardAvoidingView=host('KeyboardAvoidingView');
export const Platform={OS:'android'};export const StyleSheet={create:x=>x,flatten:x=>Array.isArray(x)?Object.assign({},...x.filter(Boolean).map(y=>StyleSheet.flatten(y))):x||{},absoluteFill:{position:'absolute'}};
export const useWindowDimensions=()=>globalThis.authDimensions||({width:390,height:844,fontScale:1});
export const useTheme=()=>({dark:false,colors:{background:'#f8faf8',surface:'#fff',input:'#fff',text:'#142c23',primary:'#087a43',border:'#e1e9e4',muted:'#61736a',elevated:'#edf5ef',error:'#93431d'}});
export const Ionicons=host('Icon'),Defs=host('Defs'),LinearGradient=host('Gradient'),Stop=host('Stop'),Rect=host('Rect'),Path=host('Path');export default host('Svg');
export const BrandLogo=host('Logo');export const ThemeToggle=host('ThemeToggle');`,
);
await writeFile(
  path.join(temp, "link.tsx"),
  `import React from 'react';export default function Link({children,...p}){return <a {...p}>{children}</a>}`,
);
await writeFile(
  path.join(temp, "notice.tsx"),
  `import React from 'react';export const Notice=({message,type})=><div role={type==='error'?'alert':'status'}>{message}</div>;export const api=(...a)=>globalThis.authTest.api(...a);`,
);
for (const [name, contents] of [
  [
    "web",
    `export {Auth,SessionHarness,NativeBootstrapHarness} from '${path.join(temp, "web.tsx")}';export {AccountLinkEntry} from '${path.resolve("apps/web/components/auth-link-entry")}';export {RecoveryRequest} from '${path.resolve("apps/web/components/auth-recovery-request")}';`,
  ],
  [
    "native",
    `export {NativeAuth,AuthShell} from '${path.resolve("apps/mobile/AuthPresentation")}';export {default as NativeRecovery} from '${path.resolve("apps/mobile/AuthRecovery")}';`,
  ],
] as const) {
  await build({
    stdin: { contents, resolveDir: process.cwd(), loader: "tsx" },
    outfile: path.join(temp, name + ".cjs"),
    bundle: true,
    format: "cjs",
    platform: "node",
    jsx: "automatic",
    plugins: [
      {
        name: "test-boundaries",
        setup(b) {
          b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
            path: req.resolve(a.path),
            external: true,
          }));
          b.onResolve(
            {
              filter: /^react-native$|^react-native-svg$|^@expo\/vector-icons$/,
            },
            () => ({ path: stub }),
          );
          b.onResolve({ filter: /\/theme$|^\.\/theme$/ }, (a) =>
            a.importer.includes("apps/mobile") ? { path: stub } : undefined,
          );
          b.onResolve({ filter: /theme-provider$/ }, () => ({ path: stub }));
          b.onResolve({ filter: /workspace-link$/ }, () => ({
            path: path.join(temp, "link.tsx"),
          }));
          b.onResolve({ filter: /\/ui$|^\.\/ui$/ }, () => ({
            path: path.join(temp, "notice.tsx"),
          }));
          b.onLoad({ filter: /\.(png|webp)$/ }, () => ({
            contents: "export default 1;",
            loader: "js",
          }));
        },
      },
    ],
  });
}
const { Auth, AccountLinkEntry, RecoveryRequest, SessionHarness, NativeBootstrapHarness } = req(path.join(temp, "web.cjs"));
const { NativeAuth, AuthShell, NativeRecovery } = req(path.join(temp, "native.cjs"));
const texts = (tree: any) => JSON.stringify(tree.toJSON());

test("AUTH-REQUEST: stalled headers/body settle once; abort, network errors and late success cannot authenticate or replay", async () => {
  for (const stage of ["headers", "body"]) {
    let calls = 0,
      signal: AbortSignal | undefined,
      late: (v: any) => void = () => {};
    const pending = withAuthDeadline(
      async (s) => {
        calls++;
        signal = s;
        if (stage === "body") await Promise.resolve();
        return new Promise((r) => (late = r));
      },
      undefined,
      15,
    );
    await assert.rejects(pending, (e: any) => e.code === "AUTH_TIMEOUT");
    assert.equal(calls, 1);
    assert.equal(signal?.aborted, true);
    late({ token: "test-only" });
    assert.equal(calls, 1);
  }
  const c = new AbortController();
  let started = false;
  c.abort();
  await assert.rejects(
    withAuthDeadline(async () => {
      started = true;
      return 1;
    }, c.signal),
    { name: "AbortError" },
  );
  assert.equal(started, false);
  await assert.rejects(
    withAuthDeadline(
      async () => {
        throw Error("Network request failed");
      },
      undefined,
      50,
    ),
    /Network request failed/,
  );
  assert.equal(await withAuthDeadline(async () => 7, undefined, 50), 7);
});

test("AUTH-WEB: actual sign-in handler prevents duplicate submits, preserves first-sign-in and routes by server role with safe returns", async () => {
  const original = {
    window: (globalThis as any).window,
    localStorage: (globalThis as any).localStorage,
    FormData: globalThis.FormData,
  };
  const values = {
    identifier: "fixture@example.test",
    password: "fixture-password",
  };
  (globalThis as any).FormData = class {
    *[Symbol.iterator]() {
      yield* Object.entries(values);
    }
  };
  (globalThis as any).window = {
    location: { search: "?returnTo=%2Fcart", origin: "https://easygas.test" },
  };
  (globalThis as any).localStorage = { setItem: () => {} };
  try {
    for (const role of [
      "customer",
      "commercial",
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "sales",
      "support",
    ]) {
      let requests = 0,
        finish: (v: any) => void = () => {},
        reset = 0,
        actualUser: any;
      const destinations: string[] = [];
      (globalThis as any).authTest = {
        search: "?returnTo=%2Fcart",
        shop: {
          user: null,
          setUser: (u: any) => (actualUser = u),
          toast: () => {},
        },
        router: {
          replace: (s: string) => destinations.push(s),
          push: (s: string) => destinations.push(s),
        },
        api: async (a: string) => {
          requests++;
          if (a === "me") return { user: { id: "fixture", role } };
          return new Promise((r) => (finish = r));
        },
      };
      let tree: any;
      await act(async () => {
        tree = create(React.createElement(Auth, { register: false }));
      });
      assert.match(texts(tree), /Open an account link/);
      assert.doesNotMatch(texts(tree), /Continue with (Apple|Google)/);
      let p: Promise<void> | undefined;
      await act(async () => {
        const submit = tree.root.findByType("form").props.onSubmit;
        p = submit({
          preventDefault() {},
          currentTarget: {
            reset() {
              reset++;
            },
          },
        });
        void submit({ preventDefault() {}, currentTarget: {} });
      });
      assert.equal(requests, 1);
      assert.equal(
        tree.root.findByProps({ className: "button full" }).props.disabled,
        true,
      );
      await act(async () => {
        finish({ role: role === "customer" ? "owner" : role });
        await p;
      });
      assert.equal(requests, 2);
      assert.equal(actualUser.role, role);
      assert.equal(reset, 1);
      assert.equal(
        destinations.at(-1),
        ["customer", "commercial"].includes(role) ? "/cart" : "/admin",
      );
      await act(async () => tree.unmount());
    }
    let count = 0;
    (globalThis as any).authTest.api = async () => {
      count++;
      return { passwordChangeRequired: true };
    };
    let tree: any;
    await act(
      async () =>
        (tree = create(React.createElement(Auth, { register: false }))),
    );
    await act(async () =>
      tree.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {}, currentTarget: {} }),
    );
    assert.match(texts(tree), /Temporary password/);
    assert.match(texts(tree), /New password/);
    assert.equal(count, 1);
    await act(async () => tree.unmount());
    for (const message of [
      "Email, phone number or password is incorrect.",
      "Too many attempts. Please try again in 15 minutes.",
      "We could not connect to EasyGas.",
      "This request timed out.",
    ]) {
      (globalThis as any).authTest.api = async () => {
        throw Error(message);
      };
      await act(
        async () =>
          (tree = create(React.createElement(Auth, { register: false }))),
      );
      await act(async () =>
        tree.root
          .findByType("form")
          .props.onSubmit({ preventDefault() {}, currentTarget: {} }),
      );
      assert.equal(
        tree.root.findByProps({ role: "alert" }).children.join(""),
        message,
      );
      assert.equal(
        tree.root.findByProps({ className: "button full" }).props.disabled,
        false,
      );
      await act(async () => tree.unmount());
    }
  } finally {
    Object.assign(globalThis, original);
    delete (globalThis as any).authTest;
  }
});

test("AUTH-NATIVE: real editable forms keep policy, masked/reveal controls, busy state, contextual registration and all entry actions", async () => {
  let submitted = 0,
    switched = 0;
  const props = {
    register: false,
    name: "",
    identifier: "",
    password: "",
    newPassword: "",
    passwordChangeRequired: false,
    error: "",
    busy: false,
    onName() {},
    onIdentifier() {},
    onPassword() {},
    onNewPassword() {},
    onSubmit() {
      submitted++;
    },
    onSwitch() {
      switched++;
    },
    onRecovery() {},
    onLink() {},
    onPolicies() {},
    onInfo() {},
    onBack() {},
  };
  let tree: any;
  await act(
    async () => (tree = create(React.createElement(NativeAuth, props))),
  );
  const password = () =>
    tree.root
      .findAllByType("TextInput")
      .find((n: any) => n.props.autoComplete === "current-password");
  assert.equal(password().props.secureTextEntry, true);
  assert.equal(tree.root.findAllByType("Pressable").find((n:any)=>n.props.accessibilityLabel==="Show password").props.style.width,48);
  await act(async () =>
    tree.root
      .findAllByType("Pressable")
      .find((n: any) => n.props.accessibilityLabel === "Show password")
      .props.onPress(),
  );
  assert.equal(password().props.secureTextEntry, false);
  await act(async () => password().props.onSubmitEditing());
  assert.equal(submitted, 1);
  assert.match(texts(tree), /Open an account link/);
  assert.doesNotMatch(texts(tree), /Continue with (Apple|Google)/);
  await act(async () =>
    tree.update(React.createElement(NativeAuth, { ...props, register: true })),
  );
  assert.match(texts(tree), /Create your account/);
  assert.match(texts(tree), /Forgot password/);
  assert.equal(
    tree.root
      .findAllByType("TextInput")
      .find((n: any) => n.props.autoComplete === "new-password").props
      .secureTextEntry,
    true,
  );
  assert.match(texts(tree), /At least/);
  assert.doesNotMatch(texts(tree), /✓|staff role|role selection/);
  await act(async () =>
    tree.update(
      React.createElement(NativeAuth, {
        ...props,
        register: true,
        password: "abcdefgh",
      }),
    ),
  );
  assert.match(texts(tree), /✓/);
  await act(async () =>
    tree.update(
      React.createElement(NativeAuth, {
        ...props,
        passwordChangeRequired: true,
        busy: true,
        error: "Fixture error",
      }),
    ),
  );
  assert.match(texts(tree), /New password/);
  assert.equal(
    tree.root
      .findAllByType("TextInput")
      .every((n: any) => n.props.editable === false),
    true,
  );
  assert.match(texts(tree), /Fixture error/);
  await act(async () => tree.unmount());
  for (const dims of [
    { width: 320, height: 568, fontScale: 1 },
    { width: 820, height: 1180, fontScale: 2 },
  ]) {
    (globalThis as any).authDimensions = dims;
    await act(
      async () =>
        (tree = create(
          React.createElement(AuthShell, {
            mode: "register",
            title: "Create your account.",
            onBack() {},
            children: "fields",
          }),
        )),
    );
    assert.match(texts(tree), /fields/);
    await act(async () => tree.unmount());
  }
  delete (globalThis as any).authDimensions;
});

test("AUTH-LINK: manual entry rejects invalid origins and preserves reset/verify/invitation/assisted paths without reading clipboard", async () => {
  const old = (globalThis as any).window;
  const destinations: string[] = [];
  (globalThis as any).window = {
    location: {
      origin: "https://easygas.test",
      assign: (s: string) => destinations.push(s),
    },
  };
  try {
    let tree: any;
    await act(
      async () =>
        (tree = create(
          React.createElement(AccountLinkEntry, { onCancel() {} }),
        )),
    );
    const enter = async (value: string) => {
      await act(async () =>
        tree.root.findByType("input").props.onChange({ target: { value } }),
      );
      await act(async () =>
        tree.root.findByType("form").props.onSubmit({ preventDefault() {} }),
      );
    };
    await enter("https://evil.test/reset-password#token=" + "a".repeat(64));
    assert.equal(destinations.length, 0);
    assert.match(texts(tree), /not a valid account link/);
    for (const p of [
      "reset-password",
      "verify-email",
      "accept-invitation",
      "activate",
    ]) {
      await enter("https://easygas.test/" + p + "#token=" + "a".repeat(64));
      assert.equal(destinations.at(-1), "/" + p + (p === "activate" ? "#" : "#token=") + "a".repeat(64));
      assert.equal(tree.root.findByType("input").props.value, "");
    }
    await enter("https://easygas.test/accept-invitation#token=" + "b".repeat(64) + "&setup=temporary");
    assert.equal(destinations.at(-1), "/accept-invitation#token=" + "b".repeat(64) + "&setup=temporary");
    await act(async () => tree.unmount());
  } finally {
    (globalThis as any).window = old;
  }
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/admin",
    "/cart#secret",
    "/\\evil.test",
  ])
    assert.equal(safeCustomerReturn(value), "/account");
});

test("AUTH-PRESERVE: backend/schema/security, onboarding and draft authority unchanged; native tabs hidden only in authentication", async () => {
  const base = "46fde7ee76fc930f27b044832f735cfd68afa85b";
  for (const file of [
    "apps/web/lib/auth.ts",
    "apps/web/lib/accounts.ts",
    "apps/web/lib/service.ts",
    "apps/web/app/api/[action]/route.ts",
    "apps/mobile/Onboarding.tsx",
    "apps/mobile/theme.tsx",
    "packages/business-rules/src/customer-navigation.ts",
    "packages/business-rules/src/native-entry-links.ts",
  ])
    assert.equal(
      await readFile(file, "utf8"),
      execFileSync("git", ["show", base + ":" + file], { encoding: "utf8" }),
      file,
    );
  assert.equal(
    execFileSync("git", ["diff", base, "--", "database"], { encoding: "utf8" }),
    "",
  );
  const native = await readFile("apps/mobile/App.tsx", "utf8");
  assert.match(native, /!authScreen && \(\s*<NextTabs/);
  assert.match(
    native,
    /\["login", "recovery", "entry-link"\]\.includes\(screen\)/,
  );
  assert.match(native, /checkoutGuestDraft\.current = draft/);
  assert.match(
    native,
    /SecureStore\.setItemAsync\("easygas.session", result.token\)/,
  );
  const link = await readFile(
    "apps/web/components/auth-link-entry.tsx",
    "utf8",
  );
  assert.doesNotMatch(
    link,
    /clipboard|localStorage|sessionStorage|console\.log/,
  );
});

test("AUTH-RECOVERY: actual web/native forms prevent duplicates, preserve errors and show identical generic confirmation only after server success",async()=>{
 let calls=0,finish:(v:any)=>void=()=>{},response='';
 (globalThis as any).authTest={api:async(a:string,d:any)=>{assert.equal(a,'account.recover');assert.equal(d.email,'unknown@example.test');calls++;return new Promise(r=>finish=r)}};
 let tree:any;await act(async()=>tree=create(React.createElement(RecoveryRequest,{onResult:(s:string)=>response=s})));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'unknown@example.test'}}));
 let p:Promise<void>|undefined;await act(async()=>{const send=tree.root.findByType('form').props.onSubmit;p=send({preventDefault(){}});void send({preventDefault(){}})});
 assert.equal(calls,1);assert.equal(response,'');await act(async()=>{finish({ok:true,message:'Must not expose provider delivery or account existence'});await p});assert.equal(response,'If an account exists for that email, follow the reset instructions sent to you.');await act(async()=>tree.unmount());
 for(const fail of [false,true]){
  calls=0;const api=async(a:string,d:any)=>{assert.equal(a,'account.recover');assert.equal(d.email,'unknown@example.test');calls++;if(fail)throw Error('Mail provider unavailable');return {ok:true,message:'Do not surface internal details'};};
  await act(async()=>tree=create(React.createElement(NativeRecovery,{api,onBack(){}})));
  await act(async()=>tree.root.findByType('TextInput').props.onChangeText('unknown@example.test'));
  await act(async()=>tree.root.findByType('TextInput').props.onSubmitEditing());assert.equal(calls,1);
  if(fail){assert.match(texts(tree),/Mail provider unavailable/);assert.doesNotMatch(texts(tree),/If an account exists/);}else{assert.match(texts(tree),/If an account exists/);assert.doesNotMatch(texts(tree),/Do not surface/);assert.equal(tree.root.findAll((n:any)=>n.type==='Text'&&n.props.accessibilityRole==='status').length,0);assert.equal(tree.root.findAll((n:any)=>n.type==='Text'&&n.props.accessibilityLiveRegion==='polite').length,1);}
  await act(async()=>tree.unmount());
 }
 delete(globalThis as any).authTest;
});

test("AUTH-SOURCE: exact approved presentation transitions and additions retain committed baselines and reject tampered source claims",async()=>{
 const {reviewedAuthenticationSourceHash,assertReviewedAuthenticationNativeScope}=await import('../scripts/lib/reviewed-authentication-source.mjs');
 const {createHash}=await import('node:crypto');const digest=(b:any)=>createHash('sha256').update(b).digest('hex');
 const review=JSON.parse(await readFile('docs/auth-redesign/reviewed-source-changes.json','utf8'));
 for(const file of Object.keys(review.files)){
  assert.equal(digest(execFileSync('git',['show',review.baseCommit+':'+file])),review.baseline[file]);
  assert.equal(await reviewedAuthenticationSourceHash(file,review.baseline[file]),digest(await readFile(file)));
  await assert.rejects(()=>reviewedAuthenticationSourceHash(file,'tampered'),/authentication historical baseline/);
 }
 for(const file of Object.keys(review.additions))assert.equal(digest(await readFile(file)),review.additions[file]);
 assert.equal(await reviewedAuthenticationSourceHash('apps/web/lib/auth.ts','unchanged'),'unchanged');
 await assertReviewedAuthenticationNativeScope(review.baseCommit);
});

test("AUTH-SESSION: actual shared session effect withholds unresolved identity, restores server roles, reports unavailable checks and ignores aborted late responses",async()=>{
 const previous={window:(globalThis as any).window,document:(globalThis as any).document};
 const replacements:string[]=[];(globalThis as any).window={addEventListener(){},removeEventListener(){},location:{replace:(s:string)=>replacements.push(s)}};(globalThis as any).document={hidden:false,addEventListener(){},removeEventListener(){}};
 try{
  for(const result of ['owner','unauthenticated','offline']){
   let finish:(v:any)=>void=()=>{},fail:(v:any)=>void=()=>{};
   (globalThis as any).authTest={api:()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject})};
   let tree:any;await act(async()=>tree=create(React.createElement(SessionHarness,{})));assert.equal(tree.root.findByType('div').props.sessionState,'pending');assert.equal(tree.root.findByType('div').props.sessionUser,null);
   await act(async()=>{if(result==='owner')finish({user:{id:'fixture-owner',role:'owner'}});else fail(Object.assign(Error(result),{status:result==='unauthenticated'?401:503}))});
   assert.equal(tree.root.findByType('div').props.sessionState,result==='offline'?'unavailable':'complete');if(result==='owner')assert.equal(tree.root.findByType('div').props.sessionUser.role,'owner');else assert.equal(tree.root.findByType('div').props.sessionUser,null);
   await act(async()=>tree.unmount());
  }
  const requests:{signal:AbortSignal,resolve:(v:any)=>void}[]=[];(globalThis as any).authTest={api:(_a:any,_d:any,o:any)=>new Promise(resolve=>requests.push({signal:o.signal,resolve}))};
  let tree:any;await act(async()=>tree=create(React.createElement(SessionHarness,{pathname:'/login'})));
  await act(async()=>tree.update(React.createElement(SessionHarness,{pathname:'/register'})));assert.equal(requests[0].signal.aborted,true);
  await act(async()=>requests[1].resolve({user:{id:'current',role:'customer'}}));await act(async()=>requests[0].resolve({user:{id:'late',role:'owner'}}));assert.equal(tree.root.findByType('div').props.sessionUser.id,'current');await act(async()=>tree.unmount());
 }finally{Object.assign(globalThis,previous);delete(globalThis as any).authTest;}
});

test("AUTH-NATIVE-BOOT: actual native startup restores identity independently of a hung catalogue or malformed cart",async()=>{
 for(const malformed of [false,true]){
  const calls:string[]=[];let catalogueSignal:AbortSignal|undefined;
  (globalThis as any).authTest={storage:async(key:string)=>key==='easygas.cart'?(malformed?'{bad-json':JSON.stringify([{productId:'fixture-product',quantity:2}])):'fixture-session',api:async(action:string,_d:any,_session:any,signal:any)=>{calls.push(action);if(action==='catalogue'){catalogueSignal=signal;return new Promise(()=>{})}assert.equal(action,'me');return {user:{id:'fixture-customer',role:'customer'}}}};
  let tree:any;await act(async()=>tree=create(React.createElement(NativeBootstrapHarness,{})));
  const state=tree.root.findByType('div').props;assert.equal(state.ready,true);assert.equal(state.user.role,'customer');assert.equal(state.catalogue,null);assert.ok(calls.includes('catalogue')&&calls.includes('me'));assert.equal(state.cart.length,malformed?0:1);
  await act(async()=>tree.unmount());assert.equal(catalogueSignal?.aborted,true);
 }
 const source=await readFile('apps/mobile/App.tsx','utf8');assert.equal((source.match(/busy=\{authBusy \|\| !hydrated\}/g)||[]).length,3);
 delete(globalThis as any).authTest;
});


test("AUTH-NATIVE-BACK: actual Back handler exits auth loops, preserves the guest checkout return and retains order drilldown", () => {
  const source = nativeSource.slice(nativeSource.indexOf("  function back() {"), nativeSource.indexOf("  useEffect(() => {\n    const subscription"));
  const createBack = new Function("authRouteRef", "navHistory", "serviceBack", "orderFilterRef", "setScreen", "setRegister", "setPassword", "setNewPassword", "setLoginError", "setPasswordChangeRequired", "setOrderFilter", source + "\nreturn back;");
  const route = { current: { screen: "login", register: false, guest: true } };
  const history = { current: ["home", "login", "recovery", "login", "entry-link", "login"] };
  const calls: any[] = [];
  const setters = ["screen", "register", "password", "newPassword", "error", "passwordChange", "orderFilter"].map(k => (value: any) => calls.push([k, value]));
  const filter = { current: null as string | null };
  const back = createBack(route, history, { current: null }, filter, ...setters);
  assert.equal(back(), true); assert.deepEqual(history.current, ["home"]); assert.deepEqual(calls.at(-1), ["screen", "home"]);
  history.current = ["home", "checkout", "login", "recovery", "login"];
  back(); assert.deepEqual(history.current, ["home", "checkout"]); assert.deepEqual(calls.at(-1), ["screen", "checkout"]);
  route.current.register = true; calls.length = 0; back(); assert.ok(calls.some(([k,v]) => k === "register" && v === false)); assert.ok(calls.some(([k,v]) => k === "password" && v === "")); assert.ok(!calls.some(([k]) => k === "screen"));
  route.current = { screen: "recovery", register: false, guest: true }; back(); assert.deepEqual(calls.at(-1), ["screen", "login"]);
  route.current = { screen: "orders", register: false, guest: false }; history.current = ["home", "orders"]; filter.current = "order-id"; back(); assert.deepEqual(calls.at(-1), ["orderFilter", null]); assert.deepEqual(history.current, ["home", "orders"]);
});
