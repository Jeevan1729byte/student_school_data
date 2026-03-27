import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, LogIn, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { loginStudent, getStudent } from "@/lib/api";

const TAISM_LOGO = "https://customer-assets.emergentagent.com/job_student-intake-11/artifacts/1c9m9kkk_image.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!studentId.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Login
      const loginResponse = await loginStudent(studentId.trim(), email.trim());
      
      if (loginResponse.success) {
        // Fetch full student details
        const studentData = await getStudent(loginResponse.student_id);
        login(studentData, loginResponse.token);
        toast.success("Login successful!");
        navigate("/dashboard");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Invalid credentials. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center mb-4">
              <img 
                src={TAISM_LOGO} 
                alt="TAISM Logo" 
                className="h-20 w-auto"
                data-testid="taism-logo"
              />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-headings tracking-tight text-center text-slate-900">
              Student Registration
            </CardTitle>
            <CardDescription className="text-center text-slate-500">
              Enter your credentials to access your registration portal
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId" className="text-sm font-medium text-slate-700">
                  Student ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    data-testid="student-id-input"
                    id="studentId"
                    type="text"
                    placeholder="Enter your Student ID"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="pl-10 h-11 bg-white border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    data-testid="email-input"
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white border-slate-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                data-testid="login-submit-button"
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">
                Only pre-registered students can access this portal.
                <br />
                Contact administration if you need assistance.
              </p>
            </div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center"
        >
          <a 
            href="/admin" 
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
            data-testid="admin-link"
          >
            Admin Access
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
