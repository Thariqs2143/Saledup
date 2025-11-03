export function QrCodePlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
    >
      <rect width="100" height="100" fill="white" />
      <rect x="10" y="10" width="25" height="25" fill="black" />
      <rect x="15" y="15" width="15" height="15" fill="white" />
      <rect x="17.5" y="17.5" width="10" height="10" fill="black" />
      <rect x="65" y="10" width="25" height="25" fill="black" />
      <rect x="70" y="15" width="15" height="15" fill="white" />
      <rect x="72.5" y="17.5" width="10" height="10" fill="black" />
      <rect x="10" y="65" width="25" height="25" fill="black" />
      <rect x="15" y="70" width="15" height="15" fill="white" />
      <rect x="17.5" y="72.5" width="10" height="10" fill="black" />
      <rect x="40" y="10" width="5" height="5" fill="black" />
      <rect x="50" y="10" width="5" height="5" fill="black" />
      <rect x="60" y="10" width="5" height="5" fill="black" />
      <rect x="40" y="20" width="5" height="5" fill="black" />
      <rect x="40" y="30" width="5" height="5" fill="black" />
      <rect x="10" y="40" width="5" height="5" fill="black" />
      <rect x="20" y="40" width="5" height="5" fill="black" />
      <rect x="30" y="40" width="5" height="5" fill="black" />
      <rect x="65" y="40" width="5" height="5" fill="black" />
      <rect x="85" y="45" width="5" height="5" fill="black" />
      <rect x="40" y="40" width="20" height="5" fill="black" />
      <rect x="45" y="45" width="20" height="5" fill="black" />
      <rect x="50" y="50" width="20" height="5" fill="black" />
      <rect x="40" y="55" width="20" height="5" fill="black" />
      <rect x="65" y="65" width="25" height="5" fill="black" />
      <rect x="65" y="75" width="5" height="5" fill="black" />
      <rect x="85" y="75" width="5" height="5" fill="black" />
      <rect x="70" y="85" width="15" height="5" fill="black" />
    </svg>
  );
}
