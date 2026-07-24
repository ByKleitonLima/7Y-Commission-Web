interface StatCardProps {
    label: string;
    value: number | string;
}

export default function StatCard({ label, value }: StatCardProps) {
    const safeValue = (typeof value === "number" && isNaN(value)) ? 0 : (value ?? 0);

    return (
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#2d2d2d]">{safeValue}</p>
        </div>
    );
}