"use client";
import { FieldCaption } from "./field-caption";
import { useEffect, useState, type FormEvent } from "react";
import { api, Notice } from "./ui";
import { FormInput } from "./password-input";
import { friendlyMessage } from "../../../packages/business-rules/src/friendly-message";
import { SUPPORT_REFRESH_MS } from "../../../packages/business-rules/src/support-refresh";

export function useSupportRecords(
  action: string | null,
  revision: number,
  keepPrevious = false,
) {
  const [snapshot, setSnapshot] = useState<{
    action: string;
    data?: any;
    error?: string;
  }>();
  useEffect(() => {
    if (!action) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let busy = false;
    async function refresh() {
      if (busy || controller.signal.aborted || document.hidden) return;
      clearTimeout(timer);
      busy = true;
      try {
        const data = await api(action!, undefined, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setSnapshot({ action: action!, data });
      } catch (error) {
        if (!controller.signal.aborted)
          setSnapshot((prior) => ({
            action: action!,
            data:
              prior?.action === action &&
              ![401, 403, 404].includes(
                (error as { status?: number }).status ?? 0,
              )
                ? prior?.data
                : undefined,
            error: (error as Error).message,
          }));
      } finally {
        busy = false;
        if (!controller.signal.aborted)
          timer = setTimeout(refresh, SUPPORT_REFRESH_MS);
      }
    }
    // Debounce search changes, and resume as soon as the tab or connection returns.
    timer = setTimeout(refresh, 200);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [action, revision]);
  return snapshot?.action === action
    ? { ...snapshot, pending: false }
    : {
        data: keepPrevious ? snapshot?.data : undefined,
        error: undefined,
        pending: Boolean(action),
      };
}
export function SupportPagination({
  page,
  pages,
  change,
  label,
}: {
  page: number;
  pages: number;
  change: (page: number) => void;
  label: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="support-pagination" aria-label={label}>
      <button
        type="button"
        className="button secondary"
        disabled={page <= 1}
        onClick={() => change(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="button secondary"
        disabled={page >= pages}
        onClick={() => change(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
export function SupportAttachmentForm({
  requestId,
  staff,
  done,
}: {
  requestId: string;
  staff: boolean;
  done: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    form.set("requestId", requestId);
    setBusy(true);
    setError("");
    try {
      const file = form.get("image");
      if (!(file instanceof File) || file.size > 3 * 1024 * 1024)
        throw new Error("Choose an image under 3 MB.");
      const response = await fetch("/api/media", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      done();
    } catch (e) {
      setError(friendlyMessage((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="workflow-form" onSubmit={upload}>
      <p>
        PNG, JPEG or WebP, up to 3 MB. Images are stored privately with the
        request.
      </p>
      <label>
        <FieldCaption required={true}>Image</FieldCaption>
        <input
          required
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
        />
      </label>
      <label>
        <FieldCaption required={true}>Description</FieldCaption>
        <input name="alt" minLength={3} maxLength={250} required />
      </label>
      {staff && (
        <label className="check">
          <input name="internal" type="checkbox" value="true" /> <FieldCaption required={false}>Staff only</FieldCaption>
        </label>
      )}
      {error && <Notice type="error" message={error} />}
      <button className="button" disabled={busy}>
        {busy ? "Uploading…" : "Attach image"}
      </button>
    </form>
  );
}
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export function SupportSlaForm({
  branch,
  done,
}: {
  branch: string | null;
  done: () => void;
}) {
  const [selected, select] = useState(branch ?? "");
  const { data: branches } = useSupportRecords("branches", 0);
  const { data, error: loadError } = useSupportRecords(
    selected
      ? `support.sla.policy?branch=${encodeURIComponent(selected)}`
      : null,
    0,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const policy = {
      responseMinutes: Number(form.get("response")),
      resolutionMinutes: Number(form.get("resolution")),
      startHour: Number(form.get("start")),
      endHour: Number(form.get("end")),
      weekdays: form.getAll("day").map(Number),
    };
    if (!policy.weekdays.length || policy.endHour <= policy.startHour) {
      setError(
        "Choose at least one working day and a closing hour after the opening hour.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("reauth", { password: form.get("password") });
      await api("support.sla.save", { branch: selected, policy });
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const policy = data?.policy;
  return (
    <div className="workflow-form">
      <label>
        <FieldCaption required={true}>Branch</FieldCaption>
        <select value={selected} onChange={(e) => select(e.target.value)}>
          <option value="">Choose branch</option>
          {(branches ?? []).map((b: any) => (
            <option value={b.id} key={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {loadError && <Notice type="error" message={loadError} />}
      {data && (
        <form className="workflow-form" key={selected} onSubmit={save}>
          <p>
            Targets count working minutes in Africa/Lagos and apply to new
            requests. Existing requests can be enrolled separately.
          </p>
          <label>
            <FieldCaption required={true}>First response target (minutes)</FieldCaption>
            <input
              required
              name="response"
              type="number"
              min="1"
              max="43200"
              defaultValue={policy?.responseMinutes}
            />
          </label>
          <label>
            <FieldCaption required={true}>Resolution target (minutes)</FieldCaption>
            <input
              required
              name="resolution"
              type="number"
              min="1"
              max="43200"
              defaultValue={policy?.resolutionMinutes}
            />
          </label>
          <fieldset>
            <legend><FieldCaption required={true}>Working days (select at least one)</FieldCaption></legend>
            {days.map((day, i) => (
              <label className="check" key={day}>
                <input
                  type="checkbox"
                  name="day"
                  value={i}
                  defaultChecked={policy?.weekdays.includes(i)}
                />
                {day}
              </label>
            ))}
          </fieldset>
          <label>
            <FieldCaption required={true}>Opening hour (0–23)</FieldCaption>
            <input
              required
              name="start"
              type="number"
              min="0"
              max="23"
              defaultValue={policy?.startHour}
            />
          </label>
          <label>
            <FieldCaption required={true}>Closing hour (1–24)</FieldCaption>
            <input
              required
              name="end"
              type="number"
              min="1"
              max="24"
              defaultValue={policy?.endHour}
            />
          </label>
          <label>
            <FieldCaption required={true}>Verify your password</FieldCaption>
            <FormInput
              required
              name="password"
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error && <Notice type="error" message={error} />}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save SLA policy"}
          </button>
        </form>
      )}
    </div>
  );
}
