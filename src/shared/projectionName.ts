const pad = (value: number): string => String(value).padStart(2, '0');

/** Default save name; LOCAL time, matching the workspace dialog. */
export function defaultProjectionName(now = new Date()): string {
  return `Projection ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`;
}
