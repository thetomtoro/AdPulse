const colors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  DRAFT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  PAUSED: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  COMPLETED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ARCHIVED: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] ?? colors.DRAFT}`}>
      {status}
    </span>
  );
}
