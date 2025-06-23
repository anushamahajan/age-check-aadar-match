
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, FileText, Camera, CheckCircle, AlertCircle } from "lucide-react";
import DocumentUpload from "@/components/DocumentUpload";
import SelfieCapture from "@/components/SelfieCapture";
import VerificationResults from "@/components/VerificationResults";

type VerificationStep = 'intro' | 'document' | 'selfie' | 'results';

interface VerificationData {
  documentImage?: string;
  selfieImage?: string;
  extractedData?: {
    name?: string;
    dob?: string;
    age?: number;
  };
  verificationResults?: {
    faceMatch: number;
    ageVerified: boolean;
    overallScore: number;
  };
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('intro');
  const [verificationData, setVerificationData] = useState<VerificationData>({});
  
  const steps = [
    { id: 'intro', title: 'Get Started', icon: Shield },
    { id: 'document', title: 'Upload ID', icon: FileText },
    { id: 'selfie', title: 'Take Selfie', icon: Camera },
    { id: 'results', title: 'Verification', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleDocumentUpload = (documentImage: string, extractedData: any) => {
    setVerificationData(prev => ({
      ...prev,
      documentImage,
      extractedData
    }));
    setCurrentStep('selfie');
  };

  const handleSelfieCapture = (selfieImage: string) => {
    setVerificationData(prev => ({
      ...prev,
      selfieImage
    }));
    
    // Simulate verification process
    setTimeout(() => {
      const faceMatch = Math.random() * 40 + 60; // 60-100% range
      const ageVerified = verificationData.extractedData?.age ? verificationData.extractedData.age >= 18 : false;
      const overallScore = (faceMatch + (ageVerified ? 20 : 0)) / (ageVerified ? 1.2 : 1.5);
      
      setVerificationData(prev => ({
        ...prev,
        verificationResults: {
          faceMatch: Math.round(faceMatch),
          ageVerified,
          overallScore: Math.round(overallScore)
        }
      }));
      setCurrentStep('results');
    }, 3000);
  };

  const resetVerification = () => {
    setCurrentStep('intro');
    setVerificationData({});
  };

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Age & Identity Verification
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Secure document verification with face matching technology
            </p>
            <Badge variant="secondary" className="text-sm">
              Proof of Concept System
            </Badge>
          </div>

          <Card className="max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                How It Works
              </CardTitle>
              <CardDescription>
                Our verification process ensures secure and accurate identity confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.slice(1).map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full mt-1">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Step {index + 1}: {step.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {step.id === 'document' && "Upload your Aadhar card for OCR text extraction"}
                          {step.id === 'selfie' && "Take a live selfie for face comparison"}
                          {step.id === 'results' && "View verification results and confidence scores"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button 
              onClick={() => setCurrentStep('document')} 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Verification
            </Button>
          </div>

          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <AlertCircle className="w-4 h-4" />
              Important Notice
            </div>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              This is a proof of concept system using simulated data. 
              Not intended for production use or legal verification purposes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Identity Verification</h1>
            <Badge variant="outline">
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`p-2 rounded-full ${
                    isCompleted ? 'bg-green-500' : 
                    isActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      isCompleted || isActive ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <span className={`ml-2 text-sm ${
                    isActive ? 'text-blue-600 font-semibold' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 'document' && (
          <DocumentUpload onDocumentUpload={handleDocumentUpload} />
        )}
        
        {currentStep === 'selfie' && (
          <SelfieCapture 
            onSelfieCapture={handleSelfieCapture}
            extractedData={verificationData.extractedData}
          />
        )}
        
        {currentStep === 'results' && (
          <VerificationResults 
            verificationData={verificationData}
            onReset={resetVerification}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
