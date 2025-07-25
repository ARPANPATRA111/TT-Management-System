import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Heading from "../components/Heading";
import { MdGroups } from "react-icons/md";
import {
  FaBook,
  FaDoorOpen,
  FaPlus,
  FaEdit,
  FaUserTie, FaSpinner, FaExclamationTriangle,
  FaLayerGroup,
} from "react-icons/fa";
import { SiBasicattentiontoken } from "react-icons/si";
import { FaTableCells } from "react-icons/fa6";
import { useUserRole } from "../context/UserRoleContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [counts, setCounts] = useState({
    faculties: 0,
    subjects: 0,
    rooms: 0,
    courses: 0,
    batch:0
  });
    const { userRole } = useUserRole();
    console.log("User Role:", userRole);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_ENDPOINTS = {
    FACULTY_COUNT: `${API_BASE_URL}/faculty`,
    SUBJECT_COUNT: `${API_BASE_URL}/subject`,
    ROOM_COUNT: `${API_BASE_URL}/room`,
    COURSE_COUNT: `${API_BASE_URL}/course`,
    BATCH_COUNT: `${API_BASE_URL}/batch`
  };

  // Function To Check Authentication
  const checkAuthentication = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.FACULTY_COUNT, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401 || response.status === 403) {
        console.log('Authentication failed - no valid cookie');
        navigate('/');
        return false;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;

    } catch (error) {
      console.error('Authentication check failed:', error);
      navigate('/');
      return false;
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setLoading(true);

        // Check authentication first
        const isAuth = await checkAuthentication();

        if (!isAuth) {
          return; // Exit early if not authenticated
        }

        setIsAuthenticated(true);

        // Proceed with fetching dashboard data
        await fetchCounts();

      } catch (error) {
        console.error('Dashboard initialization failed:', error);
        setError('Failed to initialize dashboard. Please try again.');
        navigate('/');
      }
    };

    initializeDashboard();
  }, [navigate]);

  const fetchCounts = async () => {
    try {
      setError(null);

      // Fetch all counts in parallel, including credentials (cookies)
      const responses = await Promise.all([
        fetch(API_ENDPOINTS.FACULTY_COUNT, { credentials: "include" }),
        fetch(API_ENDPOINTS.SUBJECT_COUNT, { credentials: "include" }),
        fetch(API_ENDPOINTS.ROOM_COUNT, { credentials: "include" }),
        fetch(API_ENDPOINTS.COURSE_COUNT, { credentials: "include" }),
        fetch(API_ENDPOINTS.BATCH_COUNT, { credentials: "include" })
      ]);

      // Check for authentication errors in responses
      for (const response of responses) {
        if (response.status === 401 || response.status === 403) {
          console.log('Authentication failed during data fetch, redirecting to login');
          navigate('/');
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      // Parse all responses
      const [facultyData, subjectData, roomData, courseData, batchData] = await Promise.all([
        responses[0].json(),
        responses[1].json(),
        responses[2].json(),
        responses[3].json(),
        responses[4].json()
      ]);

      // Handle both array responses and object responses with count property
      const getCount = (data) => {
        if (Array.isArray(data)) {
          return data.length;
        } else if (data && typeof data === 'object') {
          return data.count || data.total || data.length || 0;
        }
        return 0;
      };
      console.log("Counts fetched successfully:", {
        faculties: getCount(facultyData),
        subjects: getCount(subjectData),
        rooms: getCount(roomData),
        courses: getCount(courseData),
        batch: getCount(batchData)
      });

      setCounts({
        faculties: getCount(facultyData),
        subjects: getCount(subjectData),
        rooms: getCount(roomData),
        courses: getCount(courseData)
      });

    } catch (err) {
      console.error('Error fetching counts:', err);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      // Set default values on error
      setCounts({
        faculties: 0,
        subjects: 0,
        rooms: 0,
        courses: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      heading: loading ? <FaSpinner className="animate-spin" /> : counts.faculties,
      title: "Faculty Members",
      icon: MdGroups,
      iconColor: "bg-emerald-500",
      bgGradient: "from-emerald-50 to-emerald-100",
    },
    {
      heading: loading ? <FaSpinner className="animate-spin" /> : counts.subjects,
      title: "Subjects",
      icon: FaBook,
      iconColor: "bg-orange-500",
      bgGradient: "from-orange-50 to-orange-100",
    },
    {
      heading: loading ? <FaSpinner className="animate-spin" /> : counts.rooms,
      title: "Rooms",
      icon: FaDoorOpen,
      iconColor: "bg-rose-500",
      bgGradient: "from-rose-50 to-rose-100",
    },
    {
      heading: loading ? <FaSpinner className="animate-spin" /> : counts.courses,
      title: "Courses",
      icon: FaEdit,
      iconColor: "bg-blue-500",
      bgGradient: "from-blue-50 to-blue-100"
    }
  ];

  const actionCards = [
    {
      title: "Mark Attendence",
      description: "Mark the daily attendence",
      icon: SiBasicattentiontoken,
      iconColor: "bg-red-500",
      hoverColor: "hover:bg-red-50",
      route: "/attencendance",
    },
    {
      title: "View Calenders",
      description: "View timetable calender",
      icon: FaTableCells,
      iconColor: "bg-emerald-500",
      hoverColor: "hover:bg-emerald-50",
      route: "/view-timetable",
    },
    {
      title: "View All Timetables",
      description: "Access class-specific timetables",
      icon: FaTableCells,
      iconColor: "bg-teal-500",
      hoverColor: "hover:bg-teal-50",
      route: "/class-timetable",
    },
    {
      title: "Create Table",
      description: "Create new timetable schedules",
      icon: FaPlus,
      iconColor: "bg-blue-500",
      hoverColor: "hover:bg-blue-50",
      route: "/create-timetable",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Courses" : "View Courses",
      description: userRole === 3 || userRole === 2
    ? "Add, edit or remove Courses" : "View existing courses",
      icon: FaEdit,
      iconColor: "bg-amber-500",
      hoverColor: "hover:bg-amber-50",
      route: "/manage-courses",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Subjects" : "View Subjects",
      description: userRole === 3 || userRole === 2
    ? "Add, edit or remove subjects" : "View subjects information",
      icon: FaBook,
      iconColor: "bg-orange-500",
      hoverColor: "hover:bg-orange-50",
      route: "/manage-subjects",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Rooms" : "View Rooms",
      description: userRole === 3 || userRole === 2
    ? "Configure room availability" : "View room availability",
      icon: FaDoorOpen,
      iconColor: "bg-purple-500",
      hoverColor: "hover:bg-purple-50",
      route: "/manage-rooms",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Faculty" : "View Faculty",
      description: userRole === 3 || userRole === 2
    ? "Handle faculty information" : "View faculty information",
      icon: FaUserTie,
      iconColor: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-50",
      route: "/manage-faculty",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Batches" : "View Batches",
      description: userRole === 3 || userRole === 2
    ? "Organize batch details and schedules" : "View batch details and schedules",
      icon: FaLayerGroup,
      iconColor: "bg-green-500",
      hoverColor: "hover:bg-green-50",
      route: "/manage-batches",
    },
  ];
  const facultyCards = [
    {
      title: "View All Timetables",
      description: "Access class-specific timetables",
      icon: FaTableCells,
      iconColor: "bg-teal-500",
      hoverColor: "hover:bg-teal-50",
      route: "/class-timetable",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Courses" : "View Courses",
      description: userRole === 3 || userRole === 2
    ? "Add, edit or remove Courses" : "View existing courses",
      icon: FaEdit,
      iconColor: "bg-amber-500",
      hoverColor: "hover:bg-amber-50",
      route: "/manage-courses",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Subjects" : "View Subjects",
      description: userRole === 3 || userRole === 2
    ? "Add, edit or remove subjects" : "View subjects information",
      icon: FaBook,
      iconColor: "bg-orange-500",
      hoverColor: "hover:bg-orange-50",
      route: "/manage-subjects",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Rooms" : "View Rooms",
      description: userRole === 3 || userRole === 2
    ? "Configure room availability" : "View room availability",
      icon: FaDoorOpen,
      iconColor: "bg-purple-500",
      hoverColor: "hover:bg-purple-50",
      route: "/manage-rooms",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Faculty" : "View Faculty",
      description: userRole === 3 || userRole === 2
    ? "Handle faculty information" : "View faculty information",
      icon: FaUserTie,
      iconColor: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-50",
      route: "/manage-faculty",
    },
    {
      title: userRole === 3 || userRole === 2 ? "Manage Batches" : "View Batches",
      description: userRole === 3 || userRole === 2
    ? "Organize batch details and schedules" : "View batch details and schedules",
      icon: FaLayerGroup,
      iconColor: "bg-green-500",
      hoverColor: "hover:bg-green-50",
      route: "/manage-batches",
    },
  ];

  const handleRetry = () => {
    window.location.reload();
  };

  // Loading Spinner
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // This Will prevents flash of content befre redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
         <Heading text={userRole === 3 || userRole === 2 ? "Admin Dashboard" : "Faculty Dashboard"} />
      <p className="text-center text-slate-600 mt-2 text-sm sm:text-base">
        {userRole === 3 || userRole === 2 ? " Manage your academic scheduling system efficiently" : "View your academic scheduling system efficiently"}
      </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <FaExclamationTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsCards.map((card, index) => (
            <div
              key={index}
              className={`bg-gradient-to-r ${card.bgGradient} rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">
                    {card.heading}
                  </p>
                  <p className="text-slate-600 text-sm font-medium">
                    {card.title}
                  </p>
                </div>
                <div className={`${card.iconColor} p-3 rounded-lg shadow-sm`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">
            Quick Actions
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Access frequently used management tools
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
          {userRole === 3 || userRole === 2 ? actionCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.route)}
              className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-slate-200 ${card.hoverColor} group`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`${card.iconColor} p-3 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200`}
                >
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1 group-hover:text-slate-900">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Hover indicator */}
              <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="text-slate-400 text-xs flex items-center">
                  Click to access
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>)) : facultyCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.route)}
              className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-slate-200 ${card.hoverColor} group`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`${card.iconColor} p-3 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200`}
                >
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-800 mb-1 group-hover:text-slate-900">
                    {card.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Hover indicator */}
              <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="text-slate-400 text-xs flex items-center">
                  Click to access
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
