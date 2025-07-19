import { createContext, useContext, useState } from "react";
import axios from "../services/api.js";
import { useNavigate } from "react-router-dom";
import { useUserRole } from '../context/UserRoleContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { fetchUserRole, clearUserRole } = useUserRole();

  const validateSession = async () => {
    try {
      const res = await axios.get("/api/v1/user", {
        withCredentials: true,
      });

      console.log('Session validation data:', res.data);

      setIsAuthenticated(true);

      // Extract role_id from the response
      const roleId = res.data.role_id || res.data.role?.id || res.data.role_id;

      if (roleId !== undefined) {
        fetchUserRole(roleId);
      } else {
        console.error('role_id missing in session validation response');
        fetchUserRole(null);
      }

      setUserInfo(res.data);
    } catch (err) {
      console.error('Session validation failed:', err);
      setIsAuthenticated(false);
      clearUserRole();
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, passwordhash) => {
    try {
      // First try the /login endpoint
      try {
        const loginRes = await fetch("http://localhost:8080/api/v1/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, passwordhash }),
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          console.log('Login via /login successful:', loginData);

          // After successful login, get user details including role_id
          const userRes = await fetch("http://localhost:8080/api/v1/user", {
            credentials: "include",
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            const roleId = userData.find(user => user.Email === loginData.email)?.RoleID;
            if (roleId !== undefined) {
              fetchUserRole(roleId);
            } else {
              console.error('role_id missing in user details');
              fetchUserRole(null);
            }

            setIsAuthenticated(true);
            setUserInfo(userData);
            navigate("/dashboard");
            return;
          }
        }
      } catch (loginErr) {
        console.log('Login via /login failed, trying /user:', loginErr);
      }

      // Fallback to /user endpoint if /login fails
      const res = await fetch("http://localhost:8080/api/v1/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, passwordhash }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await res.json();
      console.log('Login via /user successful:', data);

      const roleId = data.role_id || data.role?.id;
      if (roleId !== undefined) {
        fetchUserRole(roleId);
      } else {
        console.error('role_id missing in login response');
        fetchUserRole(null);
      }

      setIsAuthenticated(true);
      setUserInfo(data);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
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

      if (res.status === 200) {
        setIsAuthenticated(false);
        clearUserRole();
        setUserInfo(null);
        navigate("/");
      } else {
        console.error("Logout failed with status:", res.status);
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
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
