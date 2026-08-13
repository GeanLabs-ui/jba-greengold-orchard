export function generateEmployeeCode(joiningAt: unknown, uniquePart: string = crypto.randomUUID()): string {
  const parsed = typeof joiningAt === "string" ? new Date(joiningAt) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    "-",
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  return `JBA-${stamp}-${uniquePart.slice(0, 4).toUpperCase()}`;
}
