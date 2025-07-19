import { createContext, useContext, useState, useEffect } from "react";
import axios from "../services/api.js";
import { useNavigate } from "react-router-dom";
import backendService from "../services/backendservice.js";
import { useUserRole } from '../context/UserRoleContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true); // if not needed then remove
  const navigate = useNavigate();
  const { fetchUserRole } = useUserRole();

  const validateSession = async () => {
    try {
      const res = await axios.get("/validate-session", {
        withCredentials: true,
      });
      setIsAuthenticated(true);
      setUserRole(res.data.role);
      setUserInfo(res.data.user);
    } catch (err) {
      setIsAuthenticated(false);
      setUserRole(null);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, passwordhash) => {
    try {
      const res = await fetch("http://localhost:8080/api/v1/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, passwordhash }),
      });

      const data = res.data;
      console.log(data, res.status);

      if (res.status === 200) {
        await fetchUserRole(email);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login failed", err);
      alert(err.message);
    }
  };

  const logout = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/v1/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      console.log(res.status);
      if (res.status == 200) {
        navigate("/");
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error ss", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userInfo,
        login,
        logout,
        validateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
