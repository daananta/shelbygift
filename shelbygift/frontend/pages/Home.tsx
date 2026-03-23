import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Gift,
  Sparkles,
  ArrowRight,
  Search,
  PartyPopper,
  Music,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Home() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [searchAddr, setSearchAddr] = useState("");

  const handleSearch = () => {
    const addr = searchAddr.trim();
    if (addr) {
      navigate(`/envelope/${addr}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-12 pt-8 pb-16">
      {/* Hero */}
      <div className="text-center space-y-6 animate-fade-in max-w-2xl">
        {/* Animated Envelope Icon */}
        <div className="relative inline-block">
          <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-pink-400 via-rose-400 to-pink-500 flex items-center justify-center shadow-xl animate-float">
            <Gift className="w-14 h-14 text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-md animate-pulse">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold font-[Outfit] text-gradient-pink leading-tight">
          ShelbyGift
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Create <span className="text-pink-500 font-semibold">on-chain red envelopes</span> with
          video & audio, share joy with your friends on{" "}
          <span className="font-semibold text-foreground">Shelbynet</span>
        </p>

        {connected ? (
          <Link to="/create">
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all rounded-full px-8 py-6 text-base font-semibold gap-2 animate-pulse-glow"
            >
              <Gift className="w-5 h-5" />
              Create Red Envelope Now
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        ) : (
          <div className="glass-card rounded-2xl p-6 inline-block">
            <p className="text-muted-foreground mb-3">Connect wallet to start</p>
            <p className="text-sm text-muted-foreground">
              Click <span className="font-semibold text-foreground">Connect a Wallet</span> on the top right
            </p>
          </div>
        )}
      </div>

      {/* Search Envelope */}
      <div className="w-full max-w-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Search className="w-5 h-5 text-pink-500" />
            <h3 className="font-semibold font-[Outfit]">Open Red Envelope</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter envelope address to view and claim
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="0x... envelope address"
              value={searchAddr}
              onChange={(e) => setSearchAddr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-white/50 dark:bg-white/5 border-pink-200 dark:border-pink-800 focus:border-pink-400"
            />
            <Button
              onClick={handleSearch}
              disabled={!searchAddr.trim()}
              className="bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 rounded-xl"
            >
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl animate-slide-up"
        style={{ animationDelay: "0.4s" }}
      >
        <FeatureCard
          icon={<PartyPopper className="w-7 h-7" />}
          title="Lucky Draw"
          description="Lucky draw — each person receives a random amount"
        />
        <FeatureCard
          icon={<Video className="w-7 h-7" />}
          title="Video & Audio"
          description="Send alongside a video or music, receivers see it when they open it"
        />
        <FeatureCard
          icon={<Music className="w-7 h-7" />}
          title="Shelby Protocol"
          description="Decentralized storage on Shelby — secure & durable"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-3 hover:shadow-lg transition-all group cursor-default">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-semibold font-[Outfit] text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
