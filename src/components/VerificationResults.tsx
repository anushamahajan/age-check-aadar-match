
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Shield, RotateCcw, User, Calendar, Camera, FileText } from "lucide-react";

interface VerificationData {
  documentImage?: string;
  selfieImage?: string;
  extractedData?: {
    name?: string;
    dob?: string;
    age?: number;
    documentNumber?: string;
    address?: string;
  };
  verificationResults?: {
    faceMatch: number;
    ageVerified: boolean;
    overallScore: number;
  };
}

interface VerificationResultsProps {
  verificationData: VerificationData;
  onReset: () => void;
}

const VerificationResults = ({ verificationData, onReset }: VerificationResultsProps) => {
  const { extractedData, verificationResults, documentImage, selfieImage } = verificationData;
  
  if (!verificationResults || !extractedData) {
    return <div>Loading results...</div>;
  }

  const { faceMatch, ageVerified, overallScore } = verificationResults;
  const isVerified = overallScore >= 70;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overall Result Card */}
      <Card className={`border-2 ${isVerified ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isVerified ? (
              <CheckCircle className="w-16 h-16 text-green-600" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>
          <CardTitle className={`text-2xl ${isVerified ? 'text-green-900' : 'text-red-900'}`}>
            {isVerified ? 'Verification Successful' : 'Verification Failed'}
          </CardTitle>
          <CardDescription className={isVerified ? 'text-green-700' : 'text-red-700'}>
            {isVerified 
              ? 'Identity verified successfully with high confidence'
              : 'Unable to verify identity with sufficient confidence'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="mb-4">
              <span className="text-3xl font-bold">
                {overallScore}%
              </span>
              <span className="text-gray-600 ml-2">Overall Score</span>
            </div>
            <Progress value={overallScore} className="h-3 mb-4" />
            <Badge variant={getScoreBadgeVariant(overallScore)} className="text-sm">
              {isVerified ? 'Verified' : 'Not Verified'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Face Verification */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Face Verification
            </CardTitle>
            <CardDescription>
              Comparison between document photo and selfie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Match Confidence</span>
              <span className={`text-lg font-bold ${getScoreColor(faceMatch)}`}>
                {faceMatch}%
              </span>
            </div>
            <Progress value={faceMatch} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">Document Photo</p>
                <div className="bg-yellow-100 rounded-lg p-2 h-24 flex items-center justify-center border border-yellow-200">
                  {documentImage ? (
                    <img src={documentImage} alt="Document" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <FileText className="w-8 h-8 text-yellow-400" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">Live Selfie</p>
                <div className="bg-red-100 rounded-lg p-2 h-24 flex items-center justify-center border border-red-200">
                  {selfieImage ? (
                    <img src={selfieImage} alt="Selfie" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Camera className="w-8 h-8 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Age Verification */}
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Age Verification
            </CardTitle>
            <CardDescription>
              Age requirement validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Age Requirement (18+)</span>
              <Badge variant={ageVerified ? "default" : "destructive"}>
                {ageVerified ? 'Passed' : 'Failed'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date of Birth:</span>
                <span className="font-medium">{extractedData.dob}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Age:</span>
                <span className="font-medium">{extractedData.age} years</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Minimum Age:</span>
                <span className="font-medium">18 years</span>
              </div>
            </div>

            <div className={`p-3 rounded-lg ${ageVerified ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="flex items-center gap-2">
                {ageVerified ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${ageVerified ? 'text-green-900' : 'text-red-900'}`}>
                  {ageVerified ? 'Age requirement met' : 'Age requirement not met'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extracted Information */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Extracted Information
          </CardTitle>
          <CardDescription>
            Data extracted from the uploaded Aadhaar document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Full Name</span>
                <p className="font-medium">{extractedData.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Aadhaar Number</span>
                <p className="font-medium font-mono">{extractedData.documentNumber}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Date of Birth</span>
                <p className="font-medium">{extractedData.dob}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Address</span>
                <p className="font-medium text-sm">{extractedData.address}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice & Actions */}
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-6">
            <Shield className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Security & Privacy</h4>
              <p className="text-sm text-gray-600">
                All verification data is processed securely and temporarily. 
                Images and personal information are not stored permanently.
              </p>
            </div>
          </div>
          
          <Separator className="mb-6" />
          
          <div className="flex justify-center">
            <Button onClick={onReset} variant="outline" size="lg" className="border-yellow-300 text-red-600 hover:bg-yellow-50">
              <RotateCcw className="w-4 h-4 mr-2" />
              Start New Verification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationResults;
