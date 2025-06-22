export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-screen flex-1 overflow-hidden p-0 relative">
      {/* Theme-aware gradient background */}
      <div className="absolute inset-0">
        {/* Light mode: subtle gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-amber-100 dark:from-indigo-900 dark:to-amber-900">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/50 to-rose-100/50 dark:from-cyan-900/70 dark:to-rose-900/70">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-100/40 to-purple-100/40 dark:from-green-900/60 dark:to-purple-900/60">
              {/* Subtle noise texture overlay for depth */}
              <div className="absolute inset-0 opacity-20 dark:opacity-30" 
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.3'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                  backgroundSize: '200px 200px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Content with higher z-index */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </main>
  );
}
