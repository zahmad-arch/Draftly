export default function StudioLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="animate-pulse border border-line bg-cream p-8 motion-reduce:animate-none">
        <div className="space-y-3">
          {[100, 88, 95, 60, 75, 40].map((w, i) => (
            <div key={i} className="h-2 bg-line" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
