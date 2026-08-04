export function Logo({
  className = "",
  width = 125,
  height = 34,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 select-none ${className}`}
      style={{ width, height }}
    >
      <img
        src="/logo.png"
        alt="turnup"
        width={125}
        height={34}
        className="pointer-events-none absolute inset-0 size-full object-contain"
      />
    </span>
  );
}
