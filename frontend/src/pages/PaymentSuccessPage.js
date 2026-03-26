import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Copy, Home, Loader2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getPaymentStatus, getStudent } from "@/lib/api";

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { student, updateStudent } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, success, error, expired
  const [paymentId, setPaymentId] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 10;
  const pollInterval = 2000;

  const sessionId = searchParams.get("session_id");

  const pollPaymentStatus = useCallback(async () => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    try {
      const response = await getPaymentStatus(sessionId);

      if (response.payment_status === "paid") {
        setStatus("success");
        setPaymentId(response.payment_id);
        
        // Refresh student data
        if (student?.student_id) {
          const updatedStudent = await getStudent(student.student_id);
          updateStudent(updatedStudent);
        }
        return true;
      } else if (response.status === "expired") {
        setStatus("expired");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking payment status:", error);
      if (pollCount >= maxPolls - 1) {
        setStatus("error");
        return true;
      }
      return false;
    }
  }, [sessionId, student?.student_id, updateStudent, pollCount]);

  useEffect(() => {
    let timeoutId;

    const startPolling = async () => {
      const isDone = await pollPaymentStatus();
      
      if (!isDone && pollCount < maxPolls) {
        setPollCount(prev => prev + 1);
        timeoutId = setTimeout(startPolling, pollInterval);
      }
    };

    startPolling();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pollPaymentStatus, pollCount]);

  const copyPaymentId = () => {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId);
      toast.success("Payment ID copied to clipboard!");
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-6" />
            <h2 className="font-headings text-2xl font-semibold text-slate-900 mb-2">
              Verifying Payment
            </h2>
            <p className="text-slate-500">
              Please wait while we confirm your payment...
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking status ({pollCount + 1}/{maxPolls})
            </div>
          </motion.div>
        );

      case "success":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </motion.div>

            <h2 className="font-headings text-3xl font-semibold text-slate-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-slate-500 mb-8">
              Your registration has been completed successfully.
            </p>

            {/* Payment Details */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8 max-w-sm mx-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    Completed
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Amount</span>
                  <span className="font-data font-semibold text-slate-900">$50.00</span>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Payment ID</p>
                  <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <code data-testid="payment-id-display" className="font-data text-sm text-slate-900 truncate">
                      {paymentId}
                    </code>
                    <Button
                      data-testid="copy-payment-id-button"
                      variant="ghost"
                      size="sm"
                      onClick={copyPaymentId}
                      className="flex-shrink-0 h-8 w-8 p-0"
                    >
                      <Copy className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button
              data-testid="back-to-dashboard-button"
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </motion.div>
        );

      case "expired":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-amber-600" />
            </div>
            <h2 className="font-headings text-2xl font-semibold text-slate-900 mb-2">
              Session Expired
            </h2>
            <p className="text-slate-500 mb-8">
              Your payment session has expired. Please try again.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Return to Dashboard
            </Button>
          </motion.div>
        );

      case "error":
      default:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="font-headings text-2xl font-semibold text-slate-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-slate-500 mb-8">
              We couldn't verify your payment. Please check your dashboard or contact support.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Return to Dashboard
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-slate-200 shadow-xl">
        <CardContent className="p-6 sm:p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
