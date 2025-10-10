import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Receipt, Coins, Award } from "lucide-react";
import Navigation from "@/components/Navigation";

interface ReceiptUpload {
  id: string;
  fileName: string;
  fileUrl: string;
  purchaseType: string | null;
  detectedAmount: string | null;
  detectedPlan: string | null;
  pointsAwarded: number;
  status: string;
  processingError: string | null;
  createdAt: string;
}

interface ProcessedReceipt {
  purchaseType: string;
  detectedAmount: number | null;
  detectedPlan: string | null;
  pointsAwarded: number;
  description: string;
}

export default function SubmitPurchase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<ProcessedReceipt | null>(null);

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery<ReceiptUpload[]>({
    queryKey: ["/api/receipts"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('receipt', file);
      
      return await apiRequest("/api/receipts/upload", {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "✅ Receipt Processed Successfully!",
        description: `${data.processed.description}`,
      });
      
      setProcessedResult(data.processed);
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      // Clear form after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setProcessedResult(null);
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Unable to process receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (JPEG, PNG, or WebP)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const getPurchaseTypeLabel = (type: string | null) => {
    switch (type) {
      case 'airtime': return 'Airtime';
      case 'accessory': return 'Accessory';
      case 'plan': return 'Plan Subscription';
      default: return 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation showBackButton={true} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Submit Purchase Receipt</h2>
          <p className="text-gray-600 text-sm sm:text-base">Upload your receipt to earn points automatically</p>
        </div>

        {/* Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Receipt
            </CardTitle>
            <CardDescription>
              Take a photo or upload an image of your purchase receipt. We'll detect the purchase type and award points automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#FDC800] transition-colors">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-upload"
                data-testid="input-receipt-file"
              />
              <label htmlFor="receipt-upload" className="cursor-pointer">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, WebP up to 10MB</p>
              </label>
            </div>

            {/* Preview */}
            {preview && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <img src={preview} alt="Receipt preview" className="max-h-64 mx-auto rounded-lg border" data-testid="img-receipt-preview" />
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
              data-testid="button-upload-receipt"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Receipt...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process Receipt
                </>
              )}
            </Button>

            {/* Processing Result */}
            {processedResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Receipt Processed!</h4>
                    <p className="text-sm text-green-700 mb-2">{processedResult.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge className="bg-[#FDC800] text-[#3C3C3B]">
                        <Coins className="h-3 w-3 mr-1" />
                        +{processedResult.pointsAwarded} points
                      </Badge>
                      <Badge variant="outline">{getPurchaseTypeLabel(processedResult.purchaseType)}</Badge>
                      {processedResult.detectedAmount && (
                        <Badge variant="outline">R{processedResult.detectedAmount}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Points Earning Rules */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              How to Earn Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">📱 Airtime Purchase</h4>
              <p className="text-gray-600">1 point per R1 spent (minimum R100)</p>
              <p className="text-xs text-gray-500">Example: R250 airtime = 250 points</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">🎧 Accessory Purchase</h4>
              <p className="text-gray-600">Tiered rewards based on total amount:</p>
              <ul className="text-xs text-gray-500 ml-4 mt-1 space-y-1">
                <li>• R500-R999 = 100 points</li>
                <li>• R1000-R1999 = 250 points</li>
                <li>• R2000+ = 500 points</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">📶 Plan Subscription</h4>
              <p className="text-gray-600">Points based on plan tier (100-500 points)</p>
              <p className="text-xs text-gray-500">Receipt must show plan name (Essential, Plus, Deluxe, etc.)</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Your recent receipt submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {receiptsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Loading receipts...</p>
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No receipts uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    data-testid={`receipt-item-${receipt.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{receipt.fileName}</p>
                        {getStatusBadge(receipt.status)}
                      </div>
                      {receipt.purchaseType && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{getPurchaseTypeLabel(receipt.purchaseType)}</span>
                          {receipt.detectedAmount && <span>• R{parseFloat(receipt.detectedAmount).toFixed(2)}</span>}
                          {receipt.detectedPlan && <span>• {receipt.detectedPlan} Plan</span>}
                        </div>
                      )}
                      {receipt.processingError && (
                        <p className="text-xs text-red-600 mt-1">{receipt.processingError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {receipt.pointsAwarded > 0 && (
                        <Badge className="bg-[#FDC800] text-[#3C3C3B]">
                          +{receipt.pointsAwarded} pts
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(receipt.fileUrl, '_blank')}
                        data-testid={`button-view-receipt-${receipt.id}`}
                      >
                        View
                      </Button>
                    </div>
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
