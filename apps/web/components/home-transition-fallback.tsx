"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Site from "./site";
import { PageLoadingFallback } from "./easygas-loader";
import { publicHomeCache } from "./public-home-cache";
const noServerSnapshot = () => null;
export default function HomeTransitionFallback() {
  const path = usePathname(),
    catalogue = useSyncExternalStore(
      publicHomeCache.subscribe,
      publicHomeCache.read,
      noServerSnapshot,
    );
  if (path === "/" && catalogue)
    return (
      <div data-home-retained="true">
        <Site initialCatalogue={catalogue} />
      </div>
    );
  return <PageLoadingFallback />;
}
