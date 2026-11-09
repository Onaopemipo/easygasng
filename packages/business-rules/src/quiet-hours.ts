// All EasyGas communication quiet hours use Africa/Lagos (UTC+1).
export function nextServiceMessageAt(
  now: Date,
  start: number,
  end: number,
): Date {
  const quiet = (date: Date) => {
    const hour = (date.getUTCHours() + 1) % 24;
    return start === end
      ? true
      : start < end
        ? hour >= start && hour < end
        : hour >= start || hour < end;
  };
  const result = new Date(now);
  if (!quiet(result)) return result;
  result.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 25; i++) {
    result.setUTCHours(result.getUTCHours() + 1);
    if (!quiet(result)) return result;
  }
  // Equal start/end means no delivery window; remain pending for operator review.
  return new Date(now.getTime() + 86400000);
}
