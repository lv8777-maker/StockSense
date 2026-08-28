import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Loader2, CheckCircle, Coins, Gift, Bookmark, ShoppingCart } from "lucide-react";
import Navbar from "@/components/Navbar";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import {
  buildRedemptionRequest,
  removeQualifiedReward,
  type QualifiedReward,
} from "@/lib/qualifiedRewards";

interface InvoiceSubmission {
  id: string;
  invoiceNumber: string;
  packageName: string;
  contractDuration: string;
  pointsAwarded: number;
  submittedAt: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  pointsAwarded: number;
  packageName: string;
  contractDuration: string;
  invoiceNumber: string;
  newlyQualifiedRewards: QualifiedReward[];
}

export default function UploadInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [qualifiedRewards, setQualifiedRewards] = useState<QualifiedReward[]>([]);
  const qualifiedRewardsHeadingRef = useRef<HTMLHeadingElement>(null);

  const { data: submissions = [], isLoading } = useQuery<InvoiceSubmission[]>({
    queryKey: ["/api/invoices"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("invoice", file);
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        headers: {
          "x-csrf-token": csrfToken,
        },
        body: formData,
        credentials: "include",
      });
      const data = await response.json().catch(() => ({ message: "Upload failed" }));
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      return data as UploadResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setQualifiedRewards(data.newlyQualifiedRewards ?? []);
      toast({ title: "Points awarded!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      setResult(null);
      setQualifiedRewards([]);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward: QualifiedReward) => {
      const response = await apiRequest(
        "POST",
        "/api/redemptions",
        buildRedemptionRequest(reward),
      );
      return response.json();
    },
    onSuccess: async (_data, reward) => {
      setQualifiedRewards((current) =>
        removeQualifiedReward(current, reward.id),
      );
      toast({
        title: "Reward redeemed!",
        description: `${reward.name} has been added to your redemptions.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/redemptions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rewards"] }),
      ]);
    },
    onError: (error: Error) => {
      toast({
        title: "Redemption failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (qualifiedRewards.length > 0) {
      qualifiedRewardsHeadingRef.current?.focus();
    }
  }, [qualifiedRewards.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setQualifiedRewards([]);
  };

  const handleUpload = () => {
    if (selectedFile) uploadMutation.mutate(selectedFile);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Upload MTN Tax Invoice</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Upload your official MTN Tax Invoice PDF to claim points for your contract package.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Invoice
            </CardTitle>
            <CardDescription>
              Only valid MTN Tax Invoice PDFs are accepted. Each invoice can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#FDC800] transition-colors">
              <Input
                type="file"
                accept=".pdf,application/pdf,application/x-pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="invoice-upload"
                data-testid="input-invoice-file"
              />
              <label htmlFor="invoice-upload" className="cursor-pointer">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : "Click to select your invoice PDF"}
                </p>
                <p className="text-xs text-gray-500">PDF up to 10MB</p>
              </label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full min-h-[48px] bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
              data-testid="button-upload-invoice"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Invoice...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Claim Points
                </>
              )}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Points awarded!</h4>
                    <p className="text-sm text-green-700 mb-2">{result.message}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge className="bg-[#FDC800] text-[#3C3C3B]">
                        <Coins className="h-3 w-3 mr-1" />
                        +{result.pointsAwarded} points
                      </Badge>
                      <Badge variant="outline">{result.packageName}</Badge>
                      <Badge variant="outline">{result.contractDuration}</Badge>
                      <Badge variant="outline">{result.invoiceNumber}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {qualifiedRewards.length > 0 && (
              <section
                className="mt-6 space-y-4"
                aria-labelledby="newly-qualified-rewards-heading"
                aria-live="polite"
              >
                <div>
                  <h3
                    id="newly-qualified-rewards-heading"
                    ref={qualifiedRewardsHeadingRef}
                    tabIndex={-1}
                    className="text-lg font-semibold text-gray-900"
                  >
                    You just unlocked {qualifiedRewards.length === 1 ? "a reward" : "new rewards"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Redeem now, or save your points and claim it later from Rewards.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {qualifiedRewards.map((reward) => {
                    const isRedeeming =
                      redeemMutation.isPending &&
                      redeemMutation.variables?.id === reward.id;

                    return (
                      <Card
                        key={reward.id}
                        className="overflow-hidden border-[#FDC800]/60 shadow-sm"
                        data-testid={`qualified-reward-${reward.id}`}
                      >
                        {reward.imageUrl ? (
                          <div className="h-36 overflow-hidden bg-gray-100">
                            <img
                              src={reward.imageUrl}
                              alt={reward.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-28 bg-gradient-to-br from-[#FDC800] to-[#FDC800]/60 flex items-center justify-center">
                            <Gift aria-hidden="true" className="h-12 w-12 text-white drop-shadow-sm" />
                          </div>
                        )}
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {reward.name}
                              </h4>
                              <p className="text-sm capitalize text-gray-500">
                                {reward.category}
                              </p>
                            </div>
                            <Badge className="shrink-0 bg-[#FDC800] text-[#3C3C3B]">
                              <Coins className="h-3 w-3 mr-1" />
                              {reward.pointsCost}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              onClick={() => redeemMutation.mutate(reward)}
                              disabled={redeemMutation.isPending}
                              className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                              data-testid={`button-redeem-qualified-${reward.id}`}
                            >
                              {isRedeeming ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-4 w-4 mr-2" />
                              )}
                              Redeem now
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                setQualifiedRewards((current) =>
                                  removeQualifiedReward(current, reward.id),
                                )
                              }
                              disabled={redeemMutation.isPending}
                              data-testid={`button-save-qualified-${reward.id}`}
                            >
                              <Bookmark className="h-4 w-4 mr-2" />
                              Save for later
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Invoices you've already submitted</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Loading...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No invoices uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
                    data-testid={`row-invoice-${s.invoiceNumber}`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{s.packageName}</p>
                      <p className="text-xs text-gray-500">
                        {s.invoiceNumber} • {s.contractDuration}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(s.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="bg-[#FDC800] text-[#3C3C3B]">
                      <Coins className="h-3 w-3 mr-1" />
                      +{s.pointsAwarded}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
