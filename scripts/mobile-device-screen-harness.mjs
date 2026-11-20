/** Temporary Expo Go entry for real native components that lack a current navigation path. No binary build. */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd(),
  mobile = path.join(root, "apps/mobile"),
  pkg = path.join(mobile, "package.json"),
  entry = path.join(mobile, ".device-acceptance-entry.tsx");
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error("Harness is local synthetic QA only");
const original = await fs.readFile(pkg, "utf8");
try {
  await fs.access(entry);
  throw Error("Refuse to overwrite existing entry");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const source = `import React,{useState} from 'react';import {registerRootComponent} from 'expo';import {ScrollView,View,Text,Pressable} from 'react-native';import {SafeAreaProvider} from 'react-native-safe-area-context';import {ThemeProvider} from './theme';import DriverOperations from './DriverOperations';import {Appointment} from './Services';import {AppAlertProvider} from './AppAlert';
const origin='http://127.0.0.1:3107';function Harness(){const[screen,setScreen]=useState('menu'),[data,setData]=useState<any>(null),[error,setError]=useState('');async function open(kind:string){setError('');try{const role=kind==='legacy'?'driver':'technician';const login=await(await fetch(origin+'/api/login',{method:'POST',headers:{'content-type':'application/json','x-easygas-client':'native'},body:JSON.stringify({email:role+'@native.example.test',password:'Native-device-fixture-123!'})})).json();if(!login.token)throw Error('Fixture login failed');const api=async(a:string,d?:any)=>{const response=await fetch(origin+'/api/'+a,{method:d===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',authorization:'Bearer '+login.token},...(d===undefined?{}:{body:JSON.stringify(d)})});const r=await response.json();if(!response.ok)throw Error(r.error);return r};const identity=await api('me');let booking;if(kind==='materials'){booking=(await api('bookings'))[0];if(!booking)throw Error('Assigned fixture booking missing');booking={...booking,materials:[{id:'synthetic-issued-material',name:'Synthetic issued hose fixture',quantity:1,state:'issued'},{id:'synthetic-used-material',name:'Synthetic used hose fixture',quantity:1,state:'usage_recorded'}]};}setData({api,user:identity.user,token:login.token,booking});setScreen(kind)}catch(e:any){setError(e.message)}}const button=(label:string,fn:()=>void)=><Pressable accessibilityRole='button' onPress={fn} style={{padding:18,backgroundColor:'#087a36',marginVertical:6}}><Text style={{color:'#fff'}}>{label}</Text></Pressable>;return <ScrollView style={{backgroundColor:'#f7faf7'}} contentContainerStyle={{padding:18,paddingTop:70,gap:12}}><Text accessibilityRole='header'>SYNTHETIC NATIVE COMPONENT HARNESS</Text><Text>Loopback-only QA. Legacy navigation and synthetic material presentation are separate from normal app acceptance. Do not submit material writes or grant location permissions.</Text>{button('Harness menu',()=>setScreen('menu'))}{screen==='menu'?<>{button('Open legacy DriverOperations',()=>void open('legacy'))}{button('Open Services material states',()=>void open('materials'))}</>:screen==='legacy'?<DriverOperations api={data.api} user={data.user} origin={origin} token={data.token}/>:<Appointment b={data.booking} user={{...data.user,technician_service_only:true}} api={data.api} token={data.token} apiUrl={origin} done={()=>{}}/>}{error&&<Text accessibilityRole='alert'>{error}</Text>}</ScrollView>};registerRootComponent(()=><SafeAreaProvider><ThemeProvider><Harness/><AppAlertProvider/></ThemeProvider></SafeAreaProvider>);`;
await fs.writeFile(entry, source);
const config = JSON.parse(original);
config.main = ".device-acceptance-entry.tsx";
await fs.writeFile(pkg, JSON.stringify(config, null, 2) + "\n");
let child,
  cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  await fs.writeFile(pkg, original);
  await fs.rm(entry, { force: true });
}
process.on("SIGTERM", () => {
  child?.kill("SIGTERM");
  void cleanup().then(() => process.exit(0));
});
process.on("SIGINT", () => {
  child?.kill("SIGTERM");
  void cleanup().then(() => process.exit(0));
});
child = spawn(
  "npx",
  ["expo", "start", "--go", "--localhost", "--port", "8083"],
  {
    cwd: mobile,
    stdio: "inherit",
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: "http://127.0.0.1:3107",
      EAS_BUILD_PROFILE: "preview",
    },
  },
);
child.on("exit", async (code) => {
  await cleanup();
  process.exit(code ?? 1);
});
