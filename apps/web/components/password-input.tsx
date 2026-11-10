"use client";
import React, { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Keeps native form submission, validation and autofill semantics intact. */
export const FormInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function FormInput({ type, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    if (type === "date") return <input ref={ref} type="date" {...props} onChange={(event) => {
      props.onChange?.(event);
      // Selecting a complete valid day dismisses the native calendar popover.
      if (event.currentTarget.value && event.currentTarget.validity.valid) event.currentTarget.blur();
    }} />;
    if (type !== "password") return <input ref={ref} type={type} {...props} />;
    return (
      <span className="password-control">
        <input {...props} ref={ref} type={visible ? "text" : "password"} />
        <button
          className="password-visibility-toggle"
          type="button"
          disabled={props.disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </span>
    );
  },
);
