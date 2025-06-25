
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, RotateCcw, Check, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SelfieCaptureProps {
  onSelfieCapture: (selfieImage: string) => void;
  extractedData?: {
    name?: string;
    age?: number;
  };
}

const SelfieCapture = ({ onSelfieCapture, extractedData }: SelfieCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraError(null);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please check permissions.');
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take a selfie",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Flip the image horizontally for a mirror effect
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.scale(-1, 1);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);

    // Stop the camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmSelfie = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    
    try {
      // Simulate face detection and processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Selfie processed successfully",
        description: "Face detected and ready for verification"
      });

      onSelfieCapture(capturedImage);
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process selfie. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white border-yellow-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-red-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Camera className="w-5 h-5" />
            Take Live Selfie
          </CardTitle>
          <CardDescription className="text-red-600">
            Take a clear selfie for face verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Extracted Data Summary */}
          {extractedData && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-900">Document Information</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium text-gray-800">{extractedData.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Age:</span>
                  <span className="ml-2 font-medium text-gray-800">{extractedData.age}</span>
                  {extractedData.age && extractedData.age >= 18 && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-700">18+</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Camera/Photo Display */}
          <div className="relative">
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-[4/3] flex items-center justify-center border-2 border-yellow-200">
              {cameraError ? (
                <div className="text-center text-white p-8">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-300">{cameraError}</p>
                  <Button 
                    onClick={startCamera} 
                    variant="outline" 
                    className="mt-4 bg-white text-red-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    Retry Camera Access
                  </Button>
                </div>
              ) : capturedImage ? (
                <img 
                  src={capturedImage} 
                  alt="Captured selfie" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-yellow-400 border-dashed rounded-full w-48 h-48 opacity-70"></div>
                  </div>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Selfie Guidelines */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">Selfie Guidelines</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Look directly at the camera</li>
              <li>• Ensure good lighting on your face</li>
              <li>• Remove glasses or accessories that cover your face</li>
              <li>• Keep a neutral expression</li>
              <li>• Position your face within the guide circle</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {capturedImage ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={retakePhoto}
                  className="flex-1 border-yellow-300 text-red-600 hover:bg-yellow-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button 
                  onClick={confirmSelfie}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Selfie
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                onClick={capturePhoto}
                disabled={!stream || cameraError !== null}
                className="w-full bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfieCapture;
