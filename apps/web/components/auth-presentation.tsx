"use client";
import React, { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "./workspace-link";
import { ThemeToggle } from "./theme-provider";
import { FormInput } from "./password-input";

export function AuthShell({
  mode,
  title,
  description,
  back = "/",
  onBack,
  children,
}: {
  mode: "signin" | "register" | "recovery" | "link";
  title: string;
  description?: string;
  back?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`eg-auth eg-auth-${mode}`} aria-label={title}>
      <div className="eg-auth-hero">
        <div className="eg-auth-appearance">
          <ThemeToggle />
        </div>
        {onBack ? <button type="button" onClick={onBack} className="eg-auth-back" aria-label="Go back"><ArrowLeft size={22}/></button> : <Link href={back} className="eg-auth-back" aria-label="Go back"><ArrowLeft size={22}/></Link>}
        <div className="eg-auth-logo">
          <img
            src="/assets/easygas-logo-hd.png"
            alt="EasyGas Energy Solutions"
            width="222"
            height="74"
          />
        </div>
        {mode === "signin" && (
          <div className="eg-auth-welcome">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        )}
        {mode === "recovery" || mode === "link" ? (
          <div className="eg-auth-envelope" aria-hidden="true">
            <div>
              <LockKeyhole size={42} />
            </div>
            <svg width="154" height="112" viewBox="0 0 154 112">
              <rect
                x="3"
                y="8"
                width="148"
                height="100"
                rx="14"
                fill="#087a36"
              />
              <path
                d="M5 20L77 74L149 20M5 104L56 60M149 104L98 60"
                fill="none"
                stroke="#07592e"
                strokeWidth="3"
              />
            </svg>
          </div>
        ) : (
          <div className="eg-auth-cylinders" aria-hidden="true">
            {mode === "register" && (
              <img
                className="eg-auth-cylinder-small"
                src="/assets/cylinder-illustration.png"
                alt=""
              />
            )}
            <img src="/assets/cylinder-illustration.png" alt="" />
            {mode === "register" && (
              <img
                className="eg-auth-cylinder-medium"
                src="/assets/cylinder-illustration.png"
                alt=""
              />
            )}
          </div>
        )}
        <svg
          className="eg-auth-wave"
          viewBox="0 0 600 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="#d1f460"
            d="M0 60C140 130 200-30 360 55S510 85 600 28V120H0Z"
          />
          <path
            fill="#91c900"
            fillOpacity=".65"
            d="M0 105C180 0 320 150 600 45V120H0Z"
          />
        </svg>
      </div>
      <div className="eg-auth-panel">
        {mode !== "signin" && (
          <header>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export function AuthField({
  label,
  icon = "mail",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: "mail" | "person" | "lock";
}) {
  const id = useId(),
    Icon = icon === "lock" ? LockKeyhole : icon === "person" ? UserRound : Mail;
  return (
    <div className="eg-auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="eg-auth-input">
        <Icon size={21} aria-hidden="true" />
        <FormInput {...props} id={id} />
      </div>
    </div>
  );
}
