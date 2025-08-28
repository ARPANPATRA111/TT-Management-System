import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  MapPin,
  Check,
  X,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ArrowLeft,
  ChevronUp,
} from "lucide-react";
import { GiTeacher } from "react-icons/gi";
import academicData from "../assets/academicData.json";
import backendService from "../services/backendservice";

// Helper component for loading spinner
const Spinner = ({ className = "w-12 h-12" }) => (
  <svg
    className={`animate-spin text-blue-500 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// This function corrects the timezone issue on the frontend.
const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setUTCHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() - 330); // Subtract 5 hours and 30 minutes
    const correctedHours = date.getUTCHours().toString().padStart(2, '0');
    const correctedMinutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${correctedHours}:${correctedMinutes}`;
  } catch (e) {
    console.error("Could not format time:", timeStr, e);
    return timeStr;
  }
};


// Badge component for attendance status
const StatusBadge = ({ status, onClick, disabled = false }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'held':
        return {
          label: 'Present',
          icon: Check,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          hoverColor: 'hover:bg-green-200',
          borderColor: 'border-green-300',
        };
      case 'cancelled':
        return {
          label: 'Absent',
          icon: X,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          hoverColor: 'hover:bg-red-200',
          borderColor: 'border-red-300',
        };
      default:
        return {
          label: 'Not Marked',
          icon: AlertTriangle,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          hoverColor: 'hover:bg-yellow-200',
          borderColor: 'border-yellow-300',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${disabled
        ? 'opacity-50 cursor-not-allowed'
        : `cursor-pointer hover:scale-105 hover:shadow-md ${config.hoverColor}`
        } ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </button>
  );
};

// Modal for updating attendance status
const StatusModal = React.memo(({ session, onClose, onUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(session.status || 'held');
  const statusModalRef = useRef(null);

  const statusOptions = [
    { value: 'held', label: 'Class Taken (Present)', color: 'green', icon: Check },
    { value: 'cancelled', label: 'Class Missed (Absent)', color: 'red', icon: X },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={statusModalRef}
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Update Attendance Status</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Subject:</span> {session.subject || 'N/A'}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Time:</span> {formatTime(session.start_time)} - {formatTime(session.end_time)}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Faculty:</span> {session.faculty || 'N/A'}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Room:</span> {session.room || 'N/A'}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {statusOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedStatus === option.value
                ? `border-${option.color}-500 bg-${option.color}-50`
                : 'border-gray-200 hover:bg-gray-50'
                }`}
            >
              <option.icon className={`w-5 h-5 text-${option.color}-600`} />
              <span className="font-medium">{option.label}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate(session, selectedStatus)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
});

function MarkAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState(null);

  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedFaculty, setSelectedFaculty] = useState("all");
  const [initialLoading, setInitialLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_ENDPOINTS = {
    GET_COURSE: `${API_BASE_URL}/course`,
    GET_FACULTY: `${API_BASE_URL}/faculty`,
    CALENDAR_DAY: `${API_BASE_URL}/calendar/day`,
    SESSION: `${API_BASE_URL}/session`,
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchSessions();
    }
  }, [selectedDate, selectedCourse, selectedSemester, selectedFaculty, initialLoading]);

  useEffect(() => {
    applyFilters();
  }, [sessions, searchTerm, statusFilter, timeFilter]);

  const fetchInitialData = async () => {
    setInitialLoading(true);
    try {
      const [coursesData, facultiesData] = await Promise.all([
        backendService.get('/api/v1/course'),
        backendService.get('/api/v1/faculty'),
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      const facultiesWithFullName = (facultiesData || []).map(f => ({ ...f, fullName: `${f.FirstName || ''} ${f.LastName || ''}`.trim() }));
      setFaculties(facultiesWithFullName);
      setSemesters(academicData.semesters || []);
    } catch (err) {
      setError("Failed to fetch initial data");
      console.error("Error fetching initial data:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    setSessions([]); // Clear previous sessions
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedCourse !== "all") params.append('course_id', selectedCourse);
      if (selectedSemester !== "all") params.append('semester', selectedSemester);
      if (selectedFaculty !== "all") params.append('faculty_id', selectedFaculty);

      console.log(`Fetching from: ${API_ENDPOINTS.CALENDAR_DAY}?${params}`);

      const data = await backendService.get('/api/v1/calendar/day', params);
      console.log('Raw API Response:', data);

      const sessionData = Array.isArray(data.data) ? data.data : [];
      console.log('Processed Session Data:', sessionData);

      const sortedSessions = sessionData.sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
      setSessions(sortedSessions);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(`Failed to fetch sessions: ${err.message}`);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    if (searchTerm) {
      filtered = filtered.filter(session =>
        ['subject', 'faculty', 'course_name', 'room'].some(prop =>
          (session[prop] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(session => {
        if (statusFilter === "marked") return session.status === 'held' || session.status === 'cancelled';
        if (statusFilter === "unmarked") return !session.status;
        return session.status === statusFilter;
      });
    }

    if (timeFilter !== "all") {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (selectedDate < todayStr) {
        filtered = timeFilter === 'past' ? filtered : [];
      } else if (selectedDate > todayStr) {
        filtered = timeFilter === 'upcoming' ? filtered : [];
      } else {
        filtered = filtered.filter(session => {
          const startTime = formatTime(session.start_time);
          const endTime = formatTime(session.end_time);
          if (timeFilter === "current") return currentTime >= startTime && currentTime <= endTime;
          if (timeFilter === "upcoming") return currentTime < startTime;
          if (timeFilter === "past") return currentTime > endTime;
          return true;
        });
      }
    }

    setFilteredSessions(filtered);
  };

  // REFINED: Logic updated to never delete a session, only update or create.
  const markAttendance = async (sessionToUpdate, newStatus) => {
    closeStatusModal();
    try {
      const payload = {
        TimetableID: sessionToUpdate.timetable_id,
        TimeslotID: sessionToUpdate.timeslot_id,
        Date: new Date(selectedDate).toISOString(),
        Status: newStatus, // This will be either 'held' or 'cancelled'
      };

      // If the session already exists in the database (has a session_id), we update it.
      // Otherwise, we create a new session record.
      // This single block of logic handles all cases:
      // 1. Not Marked -> Held (Creates a new session with 'held' status)
      // 2. Not Marked -> Cancelled (Creates a new session with 'cancelled' status)
      // 3. Held -> Cancelled (Updates the existing session to 'cancelled')
      // 4. Cancelled -> Held (Updates the existing session to 'held')
      const responseData = sessionToUpdate.session_id
        ? await backendService.put(`/api/v1/session/${sessionToUpdate.session_id}`, payload)
        : await backendService.post('/api/v1/session', payload);

      // Update the local state with the new data from the backend response
      const finalSessionState = {
        ...sessionToUpdate,
        status: responseData.Status,
        session_id: responseData.ID,
      };

      // Update the main sessions list to reflect the change immediately.
      setSessions(prevSessions =>
        prevSessions.map(s =>
          (s.timetable_id === sessionToUpdate.timetable_id && s.timeslot_id === sessionToUpdate.timeslot_id)
            ? finalSessionState
            : s
        )
      );

    } catch (err) {
      console.error("Error updating attendance:", err);
      setError(`Failed to update attendance: ${err.message || 'Please try again'}`);
      // Re-fetch sessions to ensure UI is in sync with the database after an error
      fetchSessions();
    }
  };


  const handleStatusBadgeClick = (session) => {
    setSelectedSessionForModal(session);
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedSessionForModal(null);
  };

  const getTimeStatus = (startTime, endTime) => {
    const today = new Date();
    const sessionDate = new Date(selectedDate);


    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);

    const currentTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;

    if (sessionDate.getTime() > today.getTime()) {
      return 'upcoming';
    } else if (sessionDate.getTime() < today.getTime()) {
      return 'past';
    } else {
      const correctedStartTime = formatTime(startTime);
      if (currentTime < correctedStartTime) return 'upcoming';
      const correctedEndTime = formatTime(endTime);
      if (currentTime > correctedEndTime) return 'past';
      return 'current';
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
        <Spinner />
        <p className="mt-4 text-lg text-gray-600">Loading Mark Lectures...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-800 flex items-center gap-2 sm:gap-3">
                Mark Lectures
              </h1>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm"
                />
              </div>
              <button
                onClick={fetchSessions}
                disabled={loading}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4 mt-6">
            {/* Course, Semester and Faculty Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm min-w-[160px]"
                >
                  <option value="all">All Courses</option>
                  {courses.map(c => (
                    <option key={c.ID} value={c.ID}>{c.Name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm min-w-[160px]"
                >
                  <option value="all">All Semesters</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.number}>{s.name || `Semester ${s.number}`}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">Faculty</label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm min-w-[160px]"
                >
                  <option value="all">All Faculties</option>
                  {faculties.map(f => (
                    <option key={f.ID} value={f.ID}>{f.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search and Additional Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex flex-col flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by subject, faculty, course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="marked">Marked</option>
                  <option value="unmarked">Not Marked</option>
                  <option value="held">Present</option>
                  <option value="cancelled">Absent</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-600 mb-1">Time</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 bg-white shadow-sm min-w-[140px]"
                >
                  <option value="all">All Times</option>
                  <option value="current">Current</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner />
              <p className="mt-4 text-gray-600">Loading sessions...</p>
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredSessions.map((session, index) => {
                const timeStatus = getTimeStatus(session.start_time, session.end_time);

                return (
                  <div key={`${session.timetable_id}-${session.timeslot_id}-${index}`} className="p-6 hover:bg-gray-50/50 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <h3 className="text-xl font-semibold text-gray-800">
                            {session.subject || 'Subject N/A'}
                          </h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${timeStatus === 'current'
                            ? 'bg-green-100 text-green-800'
                            : timeStatus === 'upcoming'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {timeStatus.charAt(0).toUpperCase() + timeStatus.slice(1)}
                          </div>
                        </div>

                        {/* Main Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-500" />
                            <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GiTeacher className="w-4 h-4 text-blue-500" />
                            <span>{session.faculty || 'Faculty N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-orange-500" />
                            <span>{session.room || 'Room N/A'}</span>
                          </div>
                        </div>

                        {/* Additional Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-500" />
                            <span>Course : {session.course_name || 'Course N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span>Semester : {session.semester || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-teal-500" />
                            <span>
                              Batch : {`${session.batch_year || ''} ${session.batch_section || ''}`.trim() || 'Batch N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <StatusBadge
                          status={session.status}
                          onClick={() => handleStatusBadgeClick(session)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Sessions Found</h3>
              <p>No sessions are scheduled for the selected date and filters.</p>
              <p className="text-sm mt-2">Try changing the date or removing some filters.</p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredSessions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Sessions',
                value: filteredSessions.length,
                icon: Calendar,
                color: 'blue'
              },
              {
                label: 'Marked Present',
                value: filteredSessions.filter(s => s.status === 'held').length,
                icon: Check,
                color: 'green'
              },
              {
                label: 'Marked Absent',
                value: filteredSessions.filter(s => s.status === 'cancelled').length,
                icon: X,
                color: 'red'
              },
              {
                label: 'Not Marked',
                value: filteredSessions.filter(s => !s.status || s.status === '').length,
                icon: AlertTriangle,
                color: 'yellow'
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`bg-gradient-to-tr from-${color}-100 to-${color}-200 p-4 rounded-xl shadow-md`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <span className={`font-semibold text-${color}-800 text-sm`}>{label}</span>
                </div>
                <p className={`text-3xl font-bold text-${color}-700`}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* StatusModal */}
      {showStatusModal && selectedSessionForModal && (
        <StatusModal
          session={selectedSessionForModal}
          onClose={closeStatusModal}
          onUpdate={markAttendance}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-5 right-5 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-lg flex items-center animate-bounce">
          <AlertTriangle className="w-6 h-6 mr-3" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default MarkAttendance;
