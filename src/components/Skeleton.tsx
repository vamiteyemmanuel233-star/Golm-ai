/** Placeholder shown while a lazily-loaded chart bundle downloads. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="skeleton" style={{ height }} role="status" aria-label="Loading chart">
      <div className="skeleton__bars" aria-hidden="true">
        {[40, 65, 50, 80, 60, 72].map((h, i) => (
          <span key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}
