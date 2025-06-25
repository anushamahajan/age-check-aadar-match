
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, FileText, Camera, CheckCircle, Zap, Users, Lock } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-6xl mx-auto pt-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 rounded-2xl shadow-xl">
                  <Shield className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 bg-white border-2 border-blue-200 rounded-full p-1">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
              SecureVerify
            </h1>
            <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
              Advanced identity verification powered by AI face matching and OCR technology
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">
                <Users className="w-4 h-4 mr-1" />
                Hackathon Project
              </Badge>
              <Badge variant="secondary" className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50">
                <Lock className="w-4 h-4 mr-1" />
                AI Powered
              </Badge>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-gray-800">Smart OCR</CardTitle>
                <CardDescription className="text-gray-600">
                  Extract data from Aadhar cards with advanced text recognition
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-gray-800">Face Matching</CardTitle>
                <CardDescription className="text-gray-600">
                  Compare live selfies with document photos using AI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <CardHeader className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-gray-800">Age Verification</CardTitle>
                <CardDescription className="text-gray-600">
                  Automatic age validation with confidence scoring
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Process Steps */}
          <Card className="bg-white border-blue-200 mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800 text-2xl text-center mb-4">
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {steps.slice(1).map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="text-center">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 rounded-full w-fit mx-auto mb-4 shadow-lg">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-800 text-lg mb-2">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {step.id === 'document' && "Upload your Aadhar card for instant data extraction"}
                        {step.id === 'selfie' && "Capture a live selfie for biometric comparison"}
                        {step.id === 'results' && "Get detailed verification results with confidence scores"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center">
            <Button 
              onClick={() => setCurrentStep('document')} 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Start Verification Process
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">SecureVerify Process</h1>
            <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50">
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-3 bg-blue-100" />
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`p-3 rounded-full transition-all duration-300 ${
                    isCompleted ? 'bg-blue-600 shadow-lg' : 
                    isActive ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg' : 'bg-blue-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isCompleted || isActive ? 'text-white' : 'text-blue-400'
                    }`} />
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-600'
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
