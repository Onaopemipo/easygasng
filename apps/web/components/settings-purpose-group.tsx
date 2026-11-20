import React from "react";
export default function SettingsPurposeGroup({
  title,
  advanced,
  searching,
  children,
}: {
  title: string;
  advanced: boolean;
  searching: boolean;
  children: React.ReactNode;
}) {
  if (!title) return <>{children}</>;
  if (advanced)
    return (
      <details
        className="settings-purpose advanced"
        open={searching || undefined}
      >
        <summary>{title}</summary>
        {children}
      </details>
    );
  return (
    <section className="settings-purpose" aria-label={title}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}
