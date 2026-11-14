"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  introductionAudience,
  introductionBenefits,
  introductionIndex,
  introductionScenes,
  webIntroductionKey,
} from "../../../packages/business-rules/src/customer-introduction";

const icons = [ShieldCheck, Star, CalendarDays];

export default function CustomerIntroduction({ role }: { role?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState<boolean>();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const item = introductionScenes[index];

  useEffect(() => {
    try {
      setSeen(Boolean(localStorage.getItem(webIntroductionKey)));
    } catch {
      setSeen(true);
    }
    const refresh = (e: StorageEvent) => {
      if (e.key === webIntroductionKey || e.key === null)
        setSeen(Boolean(e.newValue));
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  if (seen === undefined || introductionAudience(role) === "excluded")
    return null;

  function launch() {
    if (!dialog.current || dialog.current.open) return;
    setIndex(0);
    dialog.current.showModal();
    setOpen(true);
  }

  function dismiss(remember: boolean) {
    if (remember) {
      try {
        localStorage.setItem(webIntroductionKey, "seen");
      } catch {}
      setSeen(true);
    }
    dialog.current?.close();
  }

  return (
    <>
      <button
        className="intro-launch"
        type="button"
        ref={trigger}
        onClick={launch}
        aria-haspopup="dialog"
      >
        <Play size={16} aria-hidden="true" />{" "}
        {seen
          ? "View the EasyGas introduction"
          : "New to EasyGas? Take a quick tour"}
      </button>
      <dialog
        className="customer-intro"
        aria-label="EasyGas introduction"
        ref={dialog}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.altKey || event.metaKey || event.ctrlKey) return;
          if (event.key === "Tab") {
            const controls =
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not([disabled])",
              );
            const first = controls[0],
              last = controls[controls.length - 1];
            if (event.shiftKey && event.target === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && event.target === last) {
              event.preventDefault();
              first?.focus();
            }
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setIndex((value) =>
              introductionIndex(value, event.key === "ArrowLeft" ? -1 : 1),
            );
          }
        }}
      >
        {open && (
          <div className="intro-frame">
            <header className="intro-bar">
              <img
                src="/assets/introduction-logo.webp"
                width="140"
                height="47"
                alt="EasyGas Energy Solutions"
              />
              <button
                className="intro-skip"
                type="button"
                onClick={() => dismiss(true)}
                autoFocus
              >
                Skip
              </button>
            </header>
            <div className="intro-scene" key={item.id} data-scene={index}>
              <div className="intro-copy">
                <h2>
                  {item.title} <em>{item.emphasis}</em>
                </h2>
                <p>{item.body}</p>
                {index === 2 && (
                  <ul className="intro-benefits">
                    {introductionBenefits.map(({ title, detail }, i) => {
                      const Icon = icons[i];
                      return (
                        <li key={title}>
                          <Icon aria-hidden="true" size={20} />
                          <div>
                            <strong>{title}</strong>
                            <span>{detail}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="intro-art" aria-hidden="true">
                <picture>
                  {index === 1 && (
                    <source
                      media="(max-width: 600px)"
                      srcSet="/assets/about-delivery-480.webp"
                    />
                  )}
                  <img
                    alt=""
                    src={
                      index === 1
                        ? "/assets/about-delivery-768.webp"
                        : "/assets/easygas-cooking-hero-v1.webp"
                    }
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </picture>
                <svg
                  viewBox="0 0 500 90"
                  preserveAspectRatio="none"
                  focusable="false"
                >
                  <path fill="#cef0b0" d="M0 82 C170 98 265 13 500 2 V90 H0Z" />
                  <path
                    fill="#62bd34"
                    d="M0 86 C177 98 281 24 500 11 V90 H0Z"
                  />
                  <path fill="#0b5433" d="M0 90 C176 103 329 47 500 36 V90Z" />
                </svg>
              </div>
            </div>
            <footer className="intro-actions">
              <div
                className="intro-progress"
                aria-label="Introduction scenes"
                role="group"
              >
                {introductionScenes.map((scene, i) => (
                  <button
                    type="button"
                    key={scene.id}
                    aria-label={`Introduction ${i + 1} of 3`}
                    aria-current={i === index ? "step" : undefined}
                    onClick={() => setIndex(i)}
                  >
                    <span />
                  </button>
                ))}
              </div>
              <span
                role="status"
                className="intro-sr"
              >{`${item.title} ${item.emphasis}. Scene ${index + 1} of 3.`}</span>
              <div className="intro-cta">
                {index > 0 && (
                  <button
                    className="intro-back"
                    type="button"
                    onClick={() =>
                      setIndex((value) => introductionIndex(value, -1))
                    }
                  >
                    <ArrowLeft size={18} aria-hidden="true" /> Back
                  </button>
                )}
                <button
                  className="intro-next"
                  type="button"
                  onClick={() =>
                    index === 2
                      ? dismiss(true)
                      : setIndex((value) => introductionIndex(value, 1))
                  }
                >
                  {index === 2 ? "Get Started" : "Next"}
                  <ArrowRight size={19} aria-hidden="true" />
                </button>
              </div>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
