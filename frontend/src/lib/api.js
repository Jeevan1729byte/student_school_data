import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const apiClient = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth APIs
export const loginStudent = async (studentId, email) => {
  const response = await apiClient.post("/login", {
    student_id: studentId,
    email: email,
  });
  return response.data;
};

// Student APIs
export const getStudent = async (studentId) => {
  const response = await apiClient.get(`/student/${studentId}`);
  return response.data;
};

export const updateTshirtSize = async (studentId, size) => {
  const response = await apiClient.post("/student/update-tshirt", {
    student_id: studentId,
    tshirt_size: size,
  });
  return response.data;
};

// Payment APIs
export const createCheckoutSession = async (studentId) => {
  const originUrl = window.location.origin;
  const response = await apiClient.post("/payment/create-checkout", {
    student_id: studentId,
    origin_url: originUrl,
  });
  return response.data;
};

export const getPaymentStatus = async (sessionId) => {
  const response = await apiClient.get(`/payment/status/${sessionId}`);
  return response.data;
};

// Admin APIs
export const getAdminStats = async () => {
  const response = await apiClient.get("/admin/stats");
  return response.data;
};

export const getAllStudents = async () => {
  const response = await apiClient.get("/admin/students");
  return response.data;
};

export const exportCSV = () => {
  return `${API}/admin/export`;
};

export default apiClient;
