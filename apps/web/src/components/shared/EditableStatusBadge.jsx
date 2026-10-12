import { Pencil } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export default function EditableStatusBadge({
  status,
  canEdit = false,
  onClick,
  entityLabel = "record",
  className,
}) {
  if (!canEdit) return <StatusBadge status={status} />;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/status inline-flex cursor-pointer items-center gap-1 rounded-full outline-none transition hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        className,
      )}
      aria-label={`Change ${entityLabel} status. Current status: ${status}`}
      title="Click to change status"
    >
      <StatusBadge status={status} />
      <span className="grid h-5 w-5 place-items-center rounded-full bg-background/90 text-emerald-800 shadow-sm transition group-hover/status:bg-emerald-50">
        <Pencil className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}
