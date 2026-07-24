type BadgeVariant = "success" | "danger" | "neutral" | "primary";

interface StatusBadgeProps {
    label: string;
    variant: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-700",
    primary: "bg-indigo-100 text-indigo-700",
};

export default function StatusBadge({ label, variant }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variantStyles[variant]}`}
        >
            {label}
        </span>
    );
}