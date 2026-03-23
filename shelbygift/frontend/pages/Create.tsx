import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Gift,
  Upload,
  X,
  Music,
  Video,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useUploadMedia, UploadStep } from "@/hooks/useShelby";
import { useCreateEnvelope } from "@/hooks/useEnvelope";
import { useTokenBalances } from "@/hooks/useTokenBalances";

const ACCEPTED_TYPES = ".mp4,.mp3,.webm,.wav,.ogg,.mov,.jpg,.jpeg,.png,.gif,.webp";

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  encoding: "Encoding file...",
  registering: "Registering blob on-chain (sign transaction)...",
  uploading: "Uploading to Shelby...",
  done: "Upload successful!",
  error: "Upload failed",
};

export function Create() {
  const navigate = useNavigate();
  const { connected, account } = useWallet();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [amount, setAmount] = useState("");
  const [maxClaims, setMaxClaims] = useState("");
  const [isRandom, setIsRandom] = useState(true);
  const [selectedTokenMetadata, setSelectedTokenMetadata] = useState<string>("");

  // Token balances from wallet
  const { tokens, loading: loadingTokens } = useTokenBalances(account?.address?.toString());

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Hooks
  const { upload, state: uploadState, reset: resetUpload } = useUploadMedia();
  const { create, loading: creating, error: createError } = useCreateEnvelope();

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    const isValid =
      file.type.startsWith("video/") || file.type.startsWith("audio/") || file.type.startsWith("image/");
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Only accepting video, audio, or images",
      });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 100MB",
      });
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    resetUpload();
  }, [toast, resetUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    resetUpload();
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !account) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet first",
      });
      return;
    }

    const amountNum = parseInt(amount);
    const maxClaimsNum = parseInt(maxClaims);

    if (!name.trim() || !amountNum || !maxClaimsNum || !creatorName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields",
      });
      return;
    }

    if (!selectedTokenMetadata) {
      toast({
        variant: "destructive",
        title: "Missing Token",
        description: "Please select the token for the red envelope",
      });
      return;
    }

    // Optional: Kiểm tra số dư (so sánh thô, assume amountNum <= token.amount)
    const selectedToken = tokens.find(t => t.metadataAddress === selectedTokenMetadata);
    if (selectedToken && amountNum > selectedToken.amount) {
      toast({
        variant: "destructive",
        title: "Insufficient balance",
        description: "Token balance is insufficient for this amount",
      });
      return;
    }

    if (amountNum < maxClaimsNum) {
      toast({
        variant: "destructive",
        title: "Amount too low",
        description: "Total amount must be >= number of claims",
      });
      return;
    }

    let blobId = "";

    // Upload media if present
    if (mediaFile && uploadState.step !== "done") {
      const result = await upload(mediaFile);
      if (!result) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: uploadState.error || "Cannot upload media to Shelby",
        });
        return;
      }
      blobId = result;
    } else if (uploadState.step === "done" && uploadState.blobId) {
      blobId = uploadState.blobId;
    }

    // Create envelope on-chain
    const envelopeAddr = await create({
      name: name.trim(),
      message: message.trim(),
      creatorName: creatorName.trim(),
      amount: amountNum,
      maxClaims: maxClaimsNum,
      isRandom,
      blobId,
      tokenMetadataAddress: selectedTokenMetadata,
    });

    if (envelopeAddr) {
      toast({
        title: "🎉 Red envelope created!",
        description: "Redirecting to envelope page...",
      });
      setTimeout(() => {
        navigate(`/envelope/${envelopeAddr}`);
      }, 1500);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to create",
        description: createError || "Cannot create envelope on-chain",
      });
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 pt-20 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-200 to-rose-200 dark:from-pink-800/30 dark:to-rose-800/30 flex items-center justify-center">
          <Gift className="w-10 h-10 text-pink-500" />
        </div>
        <h2 className="text-2xl font-bold font-[Outfit] text-gradient-pink">
          Connect wallet to create a red envelope
        </h2>
        <p className="text-muted-foreground">
          Click "Connect a Wallet" on the top right
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="glass-card rounded-3xl p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-[Outfit] text-gradient-pink">
            Create New Red Envelope
          </h2>
          <p className="text-sm text-muted-foreground">
            Create a red envelope with video or audio
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Envelope Name <span className="text-pink-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Lunar New Year 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                className="bg-white/50 dark:bg-white/5 border-pink-200 dark:border-pink-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creator-name" className="text-sm font-medium">
                Sender Name <span className="text-pink-500">*</span>
              </Label>
              <Input
                id="creator-name"
                placeholder="Shelby"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                maxLength={32}
                className="bg-white/50 dark:bg-white/5 border-pink-200 dark:border-pink-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="message"
              placeholder="Wishing you a prosperous new year! 🎉"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              className="bg-white/50 dark:bg-white/5 border-pink-200 dark:border-pink-800 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/280
            </p>
          </div>

          {/* Token Selection */}
          <div className="space-y-4 p-4 rounded-xl bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-800/30">
            <Label className="text-sm font-medium">Select Token in Wallet <span className="text-pink-500">*</span></Label>
            
            {loadingTokens ? (
              <div className="flex items-center gap-2 text-sm text-pink-500 font-medium py-4 justify-center bg-white/50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning wallet for tokens...
              </div>
            ) : tokens.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground bg-white/50 rounded-xl border border-dashed border-pink-200">
                <AlertCircle className="w-6 h-6 text-pink-300" />
                No Fungible Asset/Coin found in your wallet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {tokens.map((token) => {
                  const displayBalance = token.decimals > 0 
                    ? (token.amount / Math.pow(10, token.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : token.amount.toLocaleString();

                  return (
                    <div
                      key={token.metadataAddress}
                      onClick={() => setSelectedTokenMetadata(token.metadataAddress)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedTokenMetadata === token.metadataAddress
                          ? "border-pink-500 bg-white shadow-sm dark:bg-black/20"
                          : "border-transparent bg-white/50 hover:bg-white/80 hover:border-pink-200 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={token.iconUri} alt={token.symbol} className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 object-cover" />
                        <div className="flex flex-col">
                          <p className="font-semibold text-sm text-foreground">{token.name} <span className="text-pink-500 font-bold ml-1">{token.symbol}</span></p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5" title={token.metadataAddress}>
                            FA: {token.metadataAddress.slice(0, 6)}...{token.metadataAddress.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-sm text-pink-600 dark:text-pink-400">
                          {displayBalance}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Available balance</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amount & Claims */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Total tokens <span className="text-pink-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/50 dark:bg-white/5 border-pink-200 dark:border-pink-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-claims" className="text-sm font-medium">
                Number of claims <span className="text-pink-500">*</span>
              </Label>
              <Input
                id="max-claims"
                type="number"
                min="1"
                max="500"
                placeholder="10"
                value={maxClaims}
                onChange={(e) => setMaxClaims(e.target.value)}
                className="bg-white/50 dark:bg-white/5 border-pink-200 dark:border-pink-800"
              />
            </div>
          </div>

          {/* Random toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-800/30">
            <div>
              <p className="font-medium text-sm">🎲 Lucky Draw</p>
              <p className="text-xs text-muted-foreground">
                {isRandom
                  ? "Each person receives a random amount"
                  : "Equally divided among receivers"}
              </p>
            </div>
            <Switch
              id="is-random"
              checked={isRandom}
              onCheckedChange={setIsRandom}
            />
          </div>

          {/* Media Upload */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Upload className="w-4 h-4 text-pink-500" />
              Attached media
              <span className="text-xs text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>

            {!mediaFile ? (
              <div
                className={`upload-zone p-8 text-center ${
                  dragOver ? "drag-over" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-pink-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      Drag & drop or click to select file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP4, MP3, JPG, PNG, WebM — Max 100MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-pink-200 dark:border-pink-800/30 overflow-hidden bg-white/50 dark:bg-white/5">
                {/* Preview */}
                <div className="relative">
                  {mediaFile.type.startsWith("image/") ? (
                    <img
                      src={mediaPreview!}
                      alt="Preview"
                      className="w-full max-h-[300px] object-cover bg-black/5"
                    />
                  ) : mediaFile.type.startsWith("video/") ? (
                    <video
                      src={mediaPreview!}
                      controls
                      className="w-full max-h-[300px] object-contain bg-black/5"
                    />
                  ) : (
                    <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0">
                        <Music className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {mediaFile.name}
                        </p>
                        <audio
                          src={mediaPreview!}
                          controls
                          className="w-full mt-2"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={removeMedia}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* File info */}
                <div className="px-4 py-3 border-t border-pink-100 dark:border-pink-800/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mediaFile.type.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 text-pink-500" />
                    ) : mediaFile.type.startsWith("video/") ? (
                      <Video className="w-4 h-4 text-pink-500" />
                    ) : (
                      <Music className="w-4 h-4 text-pink-500" />
                    )}
                    <span className="text-sm truncate max-w-[200px]">
                      {mediaFile.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(mediaFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                {/* Upload progress */}
                {uploadState.step !== "idle" &&
                  uploadState.step !== "done" &&
                  uploadState.step !== "error" && (
                    <div className="px-4 py-3 border-t border-pink-100 dark:border-pink-800/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                        <span className="text-sm text-pink-600 dark:text-pink-400">
                          {STEP_LABELS[uploadState.step]}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width:
                              uploadState.step === "encoding"
                                ? "33%"
                                : uploadState.step === "registering"
                                ? "66%"
                                : "90%",
                          }}
                        />
                      </div>
                    </div>
                  )}

                {uploadState.step === "done" && (
                  <div className="px-4 py-3 border-t border-green-100 dark:border-green-800/20 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">Upload successful!</span>
                  </div>
                )}

                {uploadState.step === "error" && (
                  <div className="px-4 py-3 border-t border-red-100 dark:border-red-800/20 flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {uploadState.error || "Upload failed"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={creating || (uploadState.step !== "idle" && uploadState.step !== "done" && uploadState.step !== "error")}
            size="lg"
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all rounded-xl py-6 text-base font-semibold gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating red envelope...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                Create Red Envelope
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
