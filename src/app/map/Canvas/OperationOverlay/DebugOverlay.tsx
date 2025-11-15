'use client';

/**
 * Debug overlay to understand coordinate systems step by step
 *
 * Step 1: Show where SVG (0,0) is
 * Step 2: Show where viewport center is
 * Step 3: Show where canvas element is
 * Step 4: Test if we can position something at a known tile
 */

export function DebugOverlay() {
  console.log('[DebugOverlay] Rendering debug overlay');

  return (
    <div
      className="debug-overlay-wrapper fixed inset-0 pointer-events-none"
      style={{ zIndex: 999999 }}
    >
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
          border: '20px solid magenta',
          background: 'rgba(255, 0, 255, 0.2)',
        }}
      >
      {/* Step 1: Mark SVG origin (0,0) - top-left of SVG */}
      <circle cx="0" cy="0" r="30" fill="lime" opacity="0.8" />
      <text x="40" y="10" fill="lime" fontSize="20" fontWeight="bold">
        SVG (0,0)
      </text>

      {/* Step 2: Mark viewport center (assuming 1920x1080) */}
      <circle cx="960" cy="540" r="30" fill="cyan" opacity="0.8" />
      <text x="1000" y="550" fill="cyan" fontSize="20" fontWeight="bold">
        Viewport Center (960,540)
      </text>

      {/* Step 3: Mark what we THINK is canvas center (from logs: 1253, 483) */}
      <circle cx="1253" cy="483" r="30" fill="yellow" opacity="0.8" />
      <text x="1290" y="490" fill="yellow" fontSize="20" fontWeight="bold">
        Canvas Center? (1253,483)
      </text>

      {/* Step 4: Mark where a tile SHOULD be (from logs: 1376.5, 269.25) */}
      <circle cx="1376.5" cy="269.25" r="50" fill="red" opacity="0.8" stroke="white" strokeWidth="5" />
      <text x="1400" y="275" fill="white" fontSize="24" fontWeight="bold" stroke="black" strokeWidth="2">
        Tile Should Be Here
      </text>
    </svg>
    </div>
  );
}
