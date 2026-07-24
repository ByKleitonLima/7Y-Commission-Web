export interface RankingItem {
    position: number;
    name: string;
    subtitle: string;
    value: string;
    avatarUrl?: string;
}

interface TopRankingCardProps {
    title: string;
    items: RankingItem[];
}

export default function TopRankingCard({ title, items }: TopRankingCardProps) {
    return (
        <div className="flex-1">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                {title}
            </h2>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-2">
                {items.map((item, index) => (
                    <div
                        key={item.position}
                        className={`flex items-center gap-3 px-2 py-3 ${index !== items.length - 1 ? "border-b border-gray-100/50" : ""
                            }`}
                    >
                        <span className="w-4 text-sm font-medium text-gray-500">
                            {item.position}º
                        </span>

                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-300 bg-gray-100/50">
                            {item.avatarUrl && (
                                <img
                                    src={item.avatarUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>

                        <div className="flex-1">
                            <p className="text-sm font-semibold leading-tight text-[#2d2d2d]">
                                {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                        </div>

                        <span className="text-sm font-semibold text-[#2d2d2d]">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}