import React, { type ReactNode } from "react";

export function FieldCaption({
  children,
  required,
}: {
  children: ReactNode;
  required: boolean;
}) {
  return (
    <span className="field-caption">
      {children}
      {required ? (
        <>
          <span className="field-required" aria-hidden="true"> *</span>
          <span className="field-required-announcement"> (required)</span>
        </>
      ) : (
        <span className="field-optional"> (optional)</span>
      )}
    </span>
  );
}
