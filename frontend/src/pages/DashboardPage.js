import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, Mail, GraduationCap, BookOpen, Award, Calendar, 
  Shirt, CreditCard, LogOut, Loader2, CheckCircle, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getStudent, updateTshirtSize, createCheckoutSession } from "@/lib/api";

const TSHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];
const REGISTRATION_FEE = 50.00;

const InfoCard = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-blue-600" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium text-slate-900 truncate ${mono ? 'font-data' : ''}`}>
        {value || "—"}
      </p>
    </div>
  </div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { student, logout, updateStudent } = useAuth();
  const [selectedSize, setSelectedSize] = useState(student?.tshirt_size || "");
  const [isSavingSize, setIsSavingSize] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [refreshedStudent, setRefreshedStudent] = useState(null);

  // Refresh student data on mount
  useEffect(() => {
    const fetchLatestData = async () => {
      if (student?.student_id) {
        try {
          const data = await getStudent(student.student_id);
          setRefreshedStudent(data);
          updateStudent(data);
          setSelectedSize(data.tshirt_size || "");
        } catch (error) {
          console.error("Failed to refresh student data:", error);
        }
      }
    };
    fetchLatestData();
  }, [student?.student_id]);

  const currentStudent = refreshedStudent || student;
  const isRegistrationComplete = currentStudent?.payment_status === "paid";
  const hasTshirtSize = !!currentStudent?.tshirt_size || !!selectedSize;

  const handleSizeChange = async (size) => {
    setSelectedSize(size);
    setIsSavingSize(true);

    try {
      await updateTshirtSize(currentStudent.student_id, size);
      updateStudent({ tshirt_size: size });
      toast.success("T-shirt size saved!");
    } catch (error) {
      toast.error("Failed to save size. Please try again.");
      setSelectedSize(currentStudent?.tshirt_size || "");
    } finally {
      setIsSavingSize(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedSize) {
      toast.error("Please select your T-shirt size first");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const response = await createCheckoutSession(currentStudent.student_id);
      
      if (response.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to initiate payment. Please try again.";
      toast.error(message);
      setIsProcessingPayment(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!currentStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-headings text-xl font-semibold text-slate-900">
              Student Portal
            </span>
          </div>
          <Button
            data-testid="logout-button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-600 hover:text-slate-900"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Welcome Banner */}
          <div className="mb-6">
            <h1 className="font-headings text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Welcome, {currentStudent.name}
            </h1>
            <p className="text-slate-500 mt-1">
              {isRegistrationComplete 
                ? "Your registration is complete." 
                : "Complete your registration below."}
            </p>
          </div>

          {/* Status Badge */}
          {isRegistrationComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Registration Complete</span>
                <span className="text-sm font-data text-emerald-600">
                  Payment ID: {currentStudent.payment_id}
                </span>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Student Information Card */}
            <Card className="lg:col-span-3 border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-headings">Student Information</CardTitle>
                <CardDescription>Your registered details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={User} label="Full Name" value={currentStudent.name} />
                  <InfoCard icon={Mail} label="Email" value={currentStudent.email} />
                  <InfoCard icon={BookOpen} label="Student ID" value={currentStudent.student_id} mono />
                  <InfoCard icon={GraduationCap} label="Department" value={currentStudent.department} />
                  <InfoCard icon={Award} label="GPA" value={currentStudent.gpa?.toFixed(2)} mono />
                  <InfoCard icon={Calendar} label="Graduation Year" value={currentStudent.graduation_year} mono />
                </div>
              </CardContent>
            </Card>

            {/* Action Card */}
            <Card className="lg:col-span-2 border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-headings">
                  {isRegistrationComplete ? "Registration Details" : "Complete Registration"}
                </CardTitle>
                <CardDescription>
                  {isRegistrationComplete 
                    ? "Your payment has been confirmed" 
                    : "Select T-shirt size and proceed to payment"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* T-Shirt Size Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <Shirt className="w-4 h-4 inline mr-2" />
                    T-Shirt Size
                  </Label>
                  {isRegistrationComplete ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Badge variant="secondary" className="font-data">
                        {currentStudent.tshirt_size}
                      </Badge>
                    </div>
                  ) : (
                    <Select
                      value={selectedSize}
                      onValueChange={handleSizeChange}
                      disabled={isSavingSize || isRegistrationComplete}
                    >
                      <SelectTrigger 
                        data-testid="tshirt-size-dropdown"
                        className="w-full h-11 bg-white border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      >
                        <SelectValue placeholder="Select your size" />
                      </SelectTrigger>
                      <SelectContent>
                        {TSHIRT_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!selectedSize && !isRegistrationComplete && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Required field
                    </p>
                  )}
                </div>

                <Separator />

                {/* Payment Summary */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Registration Fee</span>
                    <span className="font-data font-semibold text-slate-900">
                      ${REGISTRATION_FEE.toFixed(2)}
                    </span>
                  </div>

                  {isRegistrationComplete ? (
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">Payment Successful</span>
                      </div>
                      <p className="text-xs font-data text-emerald-600 mt-1">
                        ID: {currentStudent.payment_id}
                      </p>
                    </div>
                  ) : (
                    <Button
                      data-testid="proceed-to-payment-button"
                      onClick={handlePayment}
                      disabled={!hasTshirtSize || isProcessingPayment || isSavingSize}
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all active:scale-[0.98]"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecting to payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardPage;
