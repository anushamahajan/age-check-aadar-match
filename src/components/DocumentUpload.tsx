import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  onDocumentUpload: (documentImage: string, extractedData: any) => void;
}

const DocumentUpload = ({ onDocumentUpload }: DocumentUploadProps) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processDocument = async () => {
    if (!uploadedImage) return;

    setIsProcessing(true);
    
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate extracted data (in real implementation, this would come from OCR)
      const extractedData = {
        name: "Anusha Mahajan",
        dob: "23/03/2004",
        age: 21,
        documentNumber: "612793769429",
        address: "J-204, JEEVAN NIKETAN, L.I.C COLONY PASHCHIM VIHAR, Delhi, 110087"
      };

      toast({
        title: "Document processed successfully",
        description: "Information extracted from your Aadhaar card"
      });

      onDocumentUpload(uploadedImage, extractedData);
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to extract information from document",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white border-red-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <FileText className="w-5 h-5" />
            Upload Aadhaar Card
          </CardTitle>
          <CardDescription className="text-red-600">
            Upload a clear image of your Aadhaar card for verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Upload Area */}
          <div className="space-y-4">
            <Label htmlFor="document-upload" className="text-gray-700 font-medium">Select Document Image</Label>
            <div className="border-2 border-dashed border-yellow-300 rounded-lg p-8 text-center hover:border-red-400 hover:bg-yellow-50 transition-colors">
              {uploadedImage ? (
                <div className="space-y-4">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded document" 
                    className="max-w-full h-48 object-contain mx-auto rounded-lg shadow-md border border-yellow-200"
                  />
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Document uploaded successfully</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-yellow-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG or JPEG (MAX. 5MB)
                    </p>
                  </div>
                </div>
              )}
              <Input
                id="document-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              {!uploadedImage && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 border-yellow-300 text-red-600 hover:bg-yellow-50 hover:border-red-400"
                >
                  Select File
                </Button>
              )}
            </div>
          </div>

          {/* Upload Guidelines */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">Upload Guidelines</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Ensure the Aadhaar card is clearly visible and well-lit</li>
              <li>• All text should be readable without blur</li>
              <li>• Avoid shadows or reflections on the document</li>
              <li>• The entire document should be within the frame</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {uploadedImage && (
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-yellow-300 text-red-600 hover:bg-yellow-50"
              >
                Choose Different Image
              </Button>
            )}
            <Button 
              onClick={processDocument}
              disabled={!uploadedImage || isProcessing}
              className="flex-1 bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Document'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUpload;
