import Link from "next/link";

export function Footer() {
  return (
    <footer className="z-25 border-t bg-neutral-300">
      <div className="container flex h-14 items-center justify-between py-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Hexframe. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <Link
            href="https://github.com/Diplow/hexframe"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
