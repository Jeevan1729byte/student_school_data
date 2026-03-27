import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, CheckCircle, Clock, DollarSign, Download, 
  RefreshCw, Search, ArrowLeft, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getAdminStats, getAllStudents, exportCSV } from "@/lib/api";

const TAISM_LOGO = "https://customer-assets.emergentagent.com/job_student-intake-11/artifacts/1c9m9kkk_image.png";

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="font-data text-2xl font-semibold text-slate-900 mt-1">{value}</p>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, studentsData] = await Promise.all([
        getAdminStats(),
        getAllStudents()
      ]);
      setStats(statsData);
      setStudents(studentsData);
      setFilteredStudents(studentsData);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredStudents(
        students.filter(s => 
          s.name?.toLowerCase().includes(query) ||
          s.student_id?.toLowerCase().includes(query) ||
          s.email?.toLowerCase().includes(query) ||
          s.department?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, students]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    const url = exportCSV();
    window.open(url, "_blank");
    toast.success("CSV export started");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mr-2"
              data-testid="back-to-login-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img 
              src={TAISM_LOGO} 
              alt="TAISM Logo" 
              className="h-10 w-auto"
            />
            <span className="font-headings text-xl font-semibold text-slate-900">
              Admin Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="refresh-data-button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-slate-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              data-testid="export-csv-button"
              size="sm"
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Users}
            label="Total Students"
            value={stats?.total_students || 0}
            color="bg-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={stats?.completed_registrations || 0}
            subtext={`${stats?.total_students ? Math.round((stats.completed_registrations / stats.total_students) * 100) : 0}% completion rate`}
            color="bg-emerald-500"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={stats?.pending_registrations || 0}
            color="bg-amber-500"
          />
          <StatCard
            icon={DollarSign}
            label="Revenue"
            value={`$${(stats?.total_revenue || 0).toFixed(2)}`}
            color="bg-violet-500"
          />
        </div>

        {/* Students Table */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-headings">Student Registrations</CardTitle>
                <CardDescription>
                  {filteredStudents.length} of {students.length} students
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  data-testid="search-students-input"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-300"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="data-table">
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-slate-600">ID</TableHead>
                    <TableHead className="text-slate-600">Name</TableHead>
                    <TableHead className="text-slate-600 hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-slate-600 hidden md:table-cell">Department</TableHead>
                    <TableHead className="text-slate-600">Size</TableHead>
                    <TableHead className="text-slate-600">Extra</TableHead>
                    <TableHead className="text-slate-600">Status</TableHead>
                    <TableHead className="text-slate-600 hidden lg:table-cell">Payment ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow 
                        key={student.student_id} 
                        className="border-slate-100 hover:bg-slate-50"
                        data-testid={`student-row-${student.student_id}`}
                      >
                        <TableCell className="font-data text-sm">
                          {student.student_id}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {student.name}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 hidden sm:table-cell">
                          {student.email}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 hidden md:table-cell">
                          {student.department}
                        </TableCell>
                        <TableCell>
                          {student.tshirt_size ? (
                            <Badge variant="secondary" className="font-data">
                              {student.tshirt_size}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.extra_tshirts > 0 ? (
                            <Badge variant="outline" className="font-data text-blue-600 border-blue-200">
                              +{student.extra_tshirts}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.payment_status === "paid" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-data text-xs text-slate-500 hidden lg:table-cell">
                          {student.payment_id || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
