import { useState,useEffect } from "react";
import { FaUser, FaCalendarAlt } from "react-icons/fa";
import { RiLockPasswordFill } from "react-icons/ri";
import { CiLogin } from "react-icons/ci";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "..//assets/iips.png";


const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    await login(username, password);
    // console.log("Login attempted with:", username, password);
  };


  const currentYear = new Date().getFullYear();

  return (
    <div className="h-screen flex items-center bg-gray-100 max-[680px]:flex-col max-[680px]:gap-4">
      {/* Left-Section*/}
<div className="w-1/2 h-full flex flex-col items-center justify-center bg-[linear-gradient(135deg,#1e3a8a,#0f766e)] max-[680px]:w-full max-[680px]:h-1/4 max-[680px]:flex-row">
  <div className="items-center text-center">
    <img
      src={logo}
      alt="IIPS-LOGO"
      className="w-55 h-55 max-[680px]:w-20 max-[680px]:h-20"
    />
  </div>
  <div className="text-white p-8 max-[680px]:p-4 max-[680px]:w-full ">
    <h1 className="text-2xl font-bold mb-4 max-[680px]:text-center max-[680px]:text-lg max-[680px]:mb-2">International Institute of Professional Studies</h1>
    <p className="text-lg mb-8 max-[680px]:text-center max-[680px]:text-sm max-[680px]:mb-1">Devi Ahilya Vishwavidyalaya (DAVV)</p>
    <div className="flex items-center space-x-2 max-[680px]:w-full max-[680px]:flex-col max-[680px]:space-x-0">
      <div className="bg-opacity-20 p-2 rounded-lg bg-gray-400 text-3xl max-[680px]:text-2xl">
        <FaCalendarAlt />
      </div>
      <div>
        <p className="text-lg font-bold max-[680px]:text-sm">KnowledgeTime@iips</p>
        <p className="text-sm max-[680px]:text-xs">TimeTable Management System</p>
      </div>
    </div>
  </div>
</div>


      {/* Right-Section*/}
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-2xl w-96 p-12 max-[680px]:p-6">
          <h1 className="text-3xl font-bold text-center mb-3 max-[680px]:mb-1">Welcome</h1>
          <p className="text-center mb-8 text-gray-400 max-[680px]:mb-1">Please sign in to your account</p>
          <form>
            <div className="mb-4 ">
              <label className="block text-sm font-medium " htmlFor="username">
                Username
              </label>
              <div className="relative p-2 ">
                <input
                  type="text"
                  id="username"
                  value={username}
                  className="w-full px-6 py-2 border bg-gray-100 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Enter your Username"
                  onChange={(e) => setUsername(e.target.value)}
                />
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 max-[680px]:text-sm">
                  <FaUser />
                </span>
              </div>
            </div>

            <div className="mb-6 ">
              <label className="block text-sm font-medium " htmlFor="password">
                Password
              </label>
              <div className="relative p-2 ">
                <input
                  type="password"
                  id="password"
                  value={password}
                  className="w-full px-6 py-2 border bg-gray-100 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Enter your Password"
                  onChange={(e) => setPassword(e.target.value)}

                />
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 max-[680px]:text-sm">
                  <RiLockPasswordFill />
                </span>
              </div>
            </div>

            <button
              type="submit"
              onClick={handleLogin}
              className="w-full bg-[#1e40af] text-white py-2 px-4 rounded-lg hover:bg-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 flex row-auto justify-center items-center max-[680px]:text-xs"
            >
              <CiLogin />
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p className="mb-2 max-[680px]:mb-1">demo accounts</p>
            <p>Admin: admin@example.com / password123</p>
            <p>User: normal@example.com / password123</p>
          </div>

          <div className="text-center mt-8 text-xs text-gray-400">
            © {currentYear} KnowledgeTime@iips - IIPS DAVV
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
