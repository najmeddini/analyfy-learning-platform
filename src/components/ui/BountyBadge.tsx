interface BountyBadgeProps {
  prize: number;
  sponsorName: string;
  sponsorLogo: string | null;
  size?: 'sm' | 'md';
}

export default function BountyBadge({ prize, sponsorName, sponsorLogo, size = 'sm' }: BountyBadgeProps) {
  const prizeFormatted = prize.toLocaleString('fa-IR');

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border"
      style={{ backgroundColor: '#f59e0b10', borderColor: '#f59e0b40' }}
    >
      {sponsorLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sponsorLogo} alt={sponsorName} className="w-4 h-4 rounded object-contain" />
      )}
      <div className="flex flex-col leading-none">
        <span className="text-xs font-bold" style={{ color: '#d97706' }}>
          🏆 جایزه {prizeFormatted} تومان
        </span>
        {sponsorName && (
          <span className="text-xs" style={{ color: '#92400e' }}>
            اسپانسر: {sponsorName}
          </span>
        )}
      </div>
    </div>
  );
}
