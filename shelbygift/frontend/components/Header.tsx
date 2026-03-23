import { Link, useLocation } from "react-router-dom";
import { Gift } from "lucide-react";
import { WalletSelector } from "./WalletSelector";

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 glass-card">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient-pink font-[Outfit]">
            ShelbyGift
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/"
                ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                : "text-muted-foreground hover:text-foreground hover:bg-pink-50 dark:hover:bg-pink-900/10"
            }`}
          >
            Home
          </Link>
          <Link
            to="/create"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/create"
                ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                : "text-muted-foreground hover:text-foreground hover:bg-pink-50 dark:hover:bg-pink-900/10"
            }`}
          >
            Create
          </Link>
          <div className="ml-2">
            <WalletSelector />
          </div>
        </nav>
      </div>
    </header>
  );
}
