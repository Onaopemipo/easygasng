export type ThemePreference = "light" | "dark" | "system";
export function themePreference(value: unknown): ThemePreference {
  return value === "dark" || value === "system" ? value : "light";
}
export function resolvedTheme(
  preference: ThemePreference,
  systemDark: boolean,
  _path: string,
) {
  return preference === "dark" || (preference === "system" && systemDark)
    ? "dark"
    : "light";
}
export const themeBootstrap = `(()=>{try{var p=localStorage.getItem('easygas.theme');var dark=(p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'}})()`;
export function themeBootstrapFor(enabled: boolean) {
  return enabled
    ? themeBootstrap
    : "(()=>{document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'})()";
}
