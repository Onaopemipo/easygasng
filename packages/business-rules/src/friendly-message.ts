/** Preserve business/safety explanations; translate only known technical failures. */
export function friendlyMessage(value: unknown): string {
  const raw =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : "";
  const text = raw.trim();
  if (!text) return "Something went wrong. Please try again.";
  const minimum = text.match(
    /Too small: expected string to have >=(\d+) characters/i,
  );
  if (minimum) return `Enter at least ${minimum[1]} characters.`;
  const maximum = text.match(
    /Too big: expected string to have <=(\d+) characters/i,
  );
  if (maximum) return `Use no more than ${maximum[1]} characters.`;
  if (/Invalid email/i.test(text)) return "Enter a valid email address.";
  if (/Invalid ISO date$/i.test(text)) return "Choose a valid date.";
  if (/Invalid UUID/i.test(text))
    return "This reference is not valid. Select the record again and try once more.";
  if (text === "Invalid JSON.")
    return "We could not read this request. Reload the page and try again.";
  if (/Invalid ISO datetime|Invalid datetime/i.test(text))
    return "Choose a valid date and time, or leave the optional date blank to use the default.";
  if (
    /Failed to fetch|Network request failed|fetch failed|Load failed/i.test(
      text,
    )
  )
    return "We could not connect to EasyGas. Check your connection and try again.";
  if (
    /AbortError|operation was aborted|signal is aborted|timed? out/i.test(text)
  )
    return "This is taking longer than expected. Check the latest status before retrying.";
  if (/Invalid string: must match pattern|Invalid string.*regex/i.test(text))
    return /234/.test(text)
      ? "Enter a valid Nigerian mobile number, such as 08012345678 or +2348012345678."
      : "Check the highlighted information and try again.";
  if (
    /Invalid input: expected|Invalid option: expected|Unrecognized key/i.test(
      text,
    )
  )
    return "Some information is missing or has the wrong format. Review the form and try again.";
  if (
    /violates .*constraint|duplicate key value|permission denied for (?:table|schema|relation)|column .* does not exist|relation .* does not exist|syntax error at|SQLSTATE|TypeError:|ReferenceError:|\bat .*\.(tsx?|js):\d/i.test(
      text,
    )
  )
    return "We could not complete this request. Please try again, or contact support if it continues.";
  if (/^[\[{]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      const issue = Array.isArray(parsed) ? parsed[0] : parsed.issues?.[0];
      if (typeof issue?.message === "string")
        return friendlyMessage(issue.message);
    } catch {}
  }
  return text;
}
