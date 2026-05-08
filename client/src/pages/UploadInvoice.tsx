import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Loader2, CheckCircle, Coins } from "lucide-react";
import Navbar from "@/components/Navbar";

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
}

export default function UploadInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const { data: submissions = [], isLoading } = useQuery<InvoiceSubmission[]>({
    queryKey: ["/api/invoices"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("invoice", file);
      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await response.json().catch(() => ({ message: "Upload failed" }));
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      return data as UploadResult;
    },
    onSuccess: (data) => {
      setResult(data);
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
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                accept="application/pdf,.pdf"
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
