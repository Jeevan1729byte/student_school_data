import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const savedToken = sessionStorage.getItem("token");
    const savedStudent = sessionStorage.getItem("student");
    
    if (savedToken && savedStudent) {
      setToken(savedToken);
      setStudent(JSON.parse(savedStudent));
      setIsAuthenticated(true);
    }
  }, []);

  const login = (studentData, authToken) => {
    setStudent(studentData);
    setToken(authToken);
    setIsAuthenticated(true);
    sessionStorage.setItem("token", authToken);
    sessionStorage.setItem("student", JSON.stringify(studentData));
  };

  const logout = () => {
    setStudent(null);
    setToken(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("student");
  };

  const updateStudent = (updates) => {
    const updated = { ...student, ...updates };
    setStudent(updated);
    sessionStorage.setItem("student", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ 
      student, 
      token, 
      isAuthenticated, 
      login, 
      logout,
      updateStudent 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
