import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Gift,
  User,
  Clock,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Copy,
  Video,
  Music,
  PartyPopper,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  useEnvelopeInfo,
  useClaimEnvelope,
  useHasClaimed,
  useGetRemaining,
} from "@/hooks/useEnvelope";
import { getMediaUrl, getMediaType } from "@/hooks/useShelby";

export function Envelope() {
  const { address } = useParams<{ address: string }>();
  const { connected, account } = useWallet();
  const { toast } = useToast();
  const [showMedia, setShowMedia] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { info, loading, error, refetch } = useEnvelopeInfo(address);
  const {
    claim,
    loading: claiming,
    error: claimError,
    claimedAmount,
  } = useClaimEnvelope();
  const { hasClaimed, refetch: recheckClaimed } = useHasClaimed(
    account?.address?.toString(),
    address
  );
  const { remaining, refetch: refetchRemaining } = useGetRemaining(address);

  // Show media after claim
  useEffect(() => {
    if (claimedAmount !== null && info?.hasMedia) {
      setShowMedia(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [claimedAmount, info?.hasMedia]);

  // Also show media if already claimed
  useEffect(() => {
    if (hasClaimed && info?.hasMedia) {
      setShowMedia(true);
    }
  }, [hasClaimed, info?.hasMedia]);

  const handleClaim = async () => {
    if (!address) return;
    const success = await claim(address);
    if (success) {
      toast({
        title: "🎉 Claimed successfully!",
        description: `You have received the red envelope!`,
      });
      recheckClaimed();
      refetchRemaining();
      refetch();
    } else {
      toast({
        variant: "destructive",
        title: "Claim failed",
        description: claimError || "Cannot claim envelope",
      });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!" });
    } catch {
      toast({ variant: "destructive", title: "Failed to copy link" });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-20 animate-fade-in">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-muted-foreground">Loading envelope info...</p>
      </div>
    );
  }

  // Error state
  if (error || !info) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-20 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-pink-400" />
        <h2 className="text-xl font-bold font-[Outfit]">
          Envelope not found
        </h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          {error || "Invalid envelope address or not yet created"}
        </p>
        <Link to="/">
          <Button variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const claimsProgress = info.maxClaims > 0
    ? (info.currentClaims / info.maxClaims) * 100
    : 0;
  const isFullyClaimed = info.currentClaims >= info.maxClaims;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in relative">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: [
                  "#ec4899",
                  "#f43f5e",
                  "#f97316",
                  "#eab308",
                  "#a855f7",
                  "#06b6d4",
                ][i % 6],
                animation: `confetti-fall ${2 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Back button */}
      <Link
        to="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Envelope Card */}
      <div className="envelope-card text-white p-8 mb-6 animate-envelope-open">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-[Outfit]">{info.name}</h1>
              <div className="flex items-center gap-1 text-white/80 text-sm">
                <User className="w-3 h-3" />
                <span>From {info.creatorName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={copyLink}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            title="Copy link"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {info.message && (
          <p className="text-white/90 bg-white/10 rounded-xl p-4 mb-6 text-sm leading-relaxed backdrop-blur">
            {info.message}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
            <p className="text-white/60 text-xs">Total tokens</p>
            <p className="text-xl font-bold font-[Outfit]">
              {info.totalAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
            <p className="text-white/60 text-xs">Distribution</p>
            <p className="text-xl font-bold font-[Outfit]">
              {info.isRandom ? "🎲 Lucky" : "⚖️ Equal"}
            </p>
          </div>
        </div>

        {/* Claims progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-white/80">
              <Users className="w-4 h-4" />
              <span>
                {info.currentClaims}/{info.maxClaims} claimed
              </span>
            </div>
            {remaining && (
              <span className="text-white/60 text-xs">
                Remaining {remaining.balance.toLocaleString()} tokens
              </span>
            )}
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${claimsProgress}%` }}
            />
          </div>
        </div>

        {/* Time info */}
        {(info.startTime || info.endTime) && (
          <div className="flex items-center gap-2 mt-4 text-white/60 text-xs">
            <Clock className="w-3 h-3" />
            {info.startTime && (
              <span>
                Starts:{" "}
                {new Date(info.startTime * 1000).toLocaleString()}
              </span>
            )}
            {info.endTime && (
              <span>
                • Expires:{" "}
                {new Date(info.endTime * 1000).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action section */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        {!connected ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">
              Connect wallet to claim
            </p>
            <p className="text-xs text-muted-foreground">
              Click "Connect a Wallet" on the right
            </p>
          </div>
        ) : hasClaimed ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-green-600 dark:text-green-400">
                You have already claimed this envelope!
              </p>
              {claimedAmount !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Tokens received:{" "}
                  <span className="font-bold text-foreground">
                    {claimedAmount.toLocaleString()}
                  </span>
                </p>
              )}
            </div>
          </div>
        ) : isFullyClaimed ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <PartyPopper className="w-7 h-7 text-pink-500" />
            </div>
            <p className="font-semibold text-muted-foreground">
              Envelope is fully claimed!
            </p>
          </div>
        ) : !info.isOpen ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-500" />
            </div>
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              Envelope is not open yet!
            </p>
          </div>
        ) : (
          <Button
            onClick={handleClaim}
            disabled={claiming}
            size="lg"
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all rounded-xl py-6 text-base font-semibold gap-2 animate-pulse-glow"
          >
            {claiming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Claim Envelope
              </>
            )}
          </Button>
        )}
      </div>

      {/* Media section — shown after claim */}
      {showMedia && info.blobId && (
        <div
          className="glass-card rounded-2xl overflow-hidden mt-6 animate-slide-up"
        >
          <div className="p-4 border-b border-pink-100 dark:border-pink-800/20">
            <div className="flex items-center gap-2">
              {getMediaType(info.blobId) === "image" ? (
                <ImageIcon className="w-5 h-5 text-pink-500" />
              ) : getMediaType(info.blobId) === "video" ? (
                <Video className="w-5 h-5 text-pink-500" />
              ) : (
                <Music className="w-5 h-5 text-pink-500" />
              )}
              <span className="font-medium text-sm">
                Attached media
              </span>
            </div>
          </div>

          <div className="p-4">
            {getMediaType(info.blobId) === "image" ? (
              <img
                src={getMediaUrl(info.blobId)}
                alt="Envelope Media"
                className="w-full rounded-xl max-h-[500px] object-cover bg-black/5"
              />
            ) : getMediaType(info.blobId) === "video" ? (
              <video
                src={getMediaUrl(info.blobId)}
                controls
                autoPlay
                className="w-full rounded-xl max-h-[400px] object-contain bg-black/5"
              />
            ) : getMediaType(info.blobId) === "audio" ? (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0">
                  <Music className="w-7 h-7 text-white" />
                </div>
                <audio
                  src={getMediaUrl(info.blobId)}
                  controls
                  autoPlay
                  className="w-full"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Media preview not supported
              </p>
            )}
          </div>
        </div>
      )}

      {/* Envelope address */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground break-all">
          Envelope: {address}
        </p>
      </div>
    </div>
  );
}
