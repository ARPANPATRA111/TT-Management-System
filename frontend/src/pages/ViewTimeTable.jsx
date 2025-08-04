import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import SearchableSelect from "../components/SearchableSelect"; // Using SearchableSelect
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Check,
  AlertTriangle,
  Users,
  BookOpen,
  Clock,
  MapPin,
} from "lucide-react";
import { FaEdit } from "react-icons/fa";
import clsx from 'clsx';

const Spinner = ({ className = "w-12 h-12" }) => (
  <svg className={`animate-spin text-blue-500 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CalendarDay = React.memo(({ day, classes, isToday, onClick }) => {
  const hasClasses = classes.total_held > 0 || classes.total_cancelled > 0;
  let indicator = "bg-gray-300";

  if (hasClasses) {
    if (classes.total_cancelled === 0) indicator = "bg-green-500";
    else if (classes.total_held === 0) indicator = "bg-red-500";
    else indicator = "bg-yellow-400";
  }

  return (
    <div onClick={() => onClick(day)}
      className={`p-2 border border-gray-200/80 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl rounded-lg group ${isToday ? 'ring-2 ring-blue-500 shadow-lg' : ''} ${hasClasses ? 'bg-white' : 'bg-gray-50/50'}`}
    >
      <div className="flex flex-col items-center justify-center h-full min-h-[5rem]">
        <span className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>{day.getDate()}</span>
        <div className={`w-3 h-3 rounded-full mt-2 transition-all duration-300 group-hover:scale-125 ${indicator}`}></div>
      </div>
    </div>
  );
});

const StatusModal = React.memo(({ lecture, onClose, onUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(lecture.status || 'held');
  const statusModalRef = useRef(null);

  const statusOptions = [
    { value: 'held', label: 'Class Taken', color: 'green', icon: Check },
    { value: 'cancelled', label: 'Class Missed', color: 'red', icon: X },
    { value: "", label: 'No Entry', color: 'yellow', icon: AlertTriangle },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={statusModalRef}
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Update Class Status</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Subject:</span> {lecture.subject || 'N/A'}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Time:</span> {lecture.start_time}-{lecture.end_time}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {statusOptions.map((option) => (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStatus(option.value);
              }}
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
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(lecture.lecture_id, lecture.date, selectedStatus);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
});

function ViewTimeTable() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [monthSummary, setMonthSummary] = useState([]);
    const [dayDetails, setDayDetails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const modalRef = useRef(null);

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedLecture, setSelectedLecture] = useState(null);
    const statusModalRef = useRef(null);

    const [courses, setCourses] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);

    const [selectedFilters, setSelectedFilters] = useState({
        course: null,
        batch: null,
        semester: null,
        faculty: null,
        room: null,
    });

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    const API_ENDPOINTS = {
        GET_COURSE: `${API_BASE_URL}/course`,
        GET_BATCH: `${API_BASE_URL}/batch`,
        GET_FACULTY: `${API_BASE_URL}/faculty`,
        GET_ROOM: `${API_BASE_URL}/room`,
        CALENDAR: `${API_BASE_URL}/calendar`,
        CALENDAR_DAY: `${API_BASE_URL}/calendar/day`,
        SESSION: `${API_BASE_URL}/session`,
    };

    const calendarCache = useRef({});

    const fetchWithAuth = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        const response = await fetch(url, { ...options, headers, credentials: 'include' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    };

    const fetchAllInitialData = async () => {
        setInitialLoading(true);
        setError(null);
        try {
            const [coursesData, batchesData, facultiesData, roomsData] = await Promise.all([
                fetchWithAuth(API_ENDPOINTS.GET_COURSE),
                fetchWithAuth(API_ENDPOINTS.GET_BATCH),
                fetchWithAuth(API_ENDPOINTS.GET_FACULTY),
                fetchWithAuth(API_ENDPOINTS.GET_ROOM),
            ]);
            setCourses(coursesData || []);
            setBatches(batchesData || []);
            setRooms(roomsData || []);
            setSemesters(academicData.semesters || []);
            const facultiesWithFullName = (facultiesData || []).map(f => ({ ...f, fullName: `${f.FirstName || ''} ${f.LastName || ''}`.trim() }));
            setFaculties(facultiesWithFullName);
        } catch (err) {
            setError("Failed to fetch initial data from server");
            console.error("Error fetching initial data:", err);
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchAllInitialData();
    }, []);

    useEffect(() => {
        if (!initialLoading) {
            const timer = setTimeout(() => {
                fetchMonthSummary();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [currentDate, selectedFilters, initialLoading]);

    useEffect(() => {
        if (selectedDate && !initialLoading) {
            const timer = setTimeout(() => {
                fetchDayDetails(selectedDate);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedDate, initialLoading]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showStatusModal && statusModalRef.current && !statusModalRef.current.contains(event.target)) {
                if (modalRef.current && !modalRef.current.contains(event.target)) {
                    closeStatusModal();
                }
            }
        };

        if (showStatusModal) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showStatusModal]);


    const fetchMonthSummary = async () => {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const cacheKey = `${month}-${year}-${JSON.stringify(selectedFilters)}`;

        if (calendarCache.current[cacheKey]) {
            setMonthSummary(calendarCache.current[cacheKey]);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({ month: month.toString(), year: year.toString() });

            if (selectedFilters.faculty) {
                const selectedFaculty = faculties.find(f => f.fullName === selectedFilters.faculty);
                if (selectedFaculty) params.append('faculty_id', selectedFaculty.ID);
            } else if (selectedFilters.room) {
                params.append('room', selectedFilters.room);
            } else if (selectedFilters.course && selectedFilters.batch && selectedFilters.semester) {
                const selectedCourse = courses.find(c => c.Name === selectedFilters.course);
                const [yearStr, sectionName] = selectedFilters.batch.split('-');
                if (selectedCourse) {
                    params.append('course_id', selectedCourse.ID);
                    params.append('year', yearStr);
                    params.append('section', sectionName);
                    params.append('semester', romanToInteger(selectedFilters.semester));
                }
            }

            const response = await fetchWithAuth(`${API_ENDPOINTS.CALENDAR}?${params}`);
            const summaryData = Array.isArray(response) ? response : (response.data || []);
            setMonthSummary(summaryData);
            calendarCache.current[cacheKey] = summaryData;
            setError(null);
        } catch (err) {
            setError("Failed to fetch calendar data");
            console.error('Error fetching month summary:', err);
            setMonthSummary([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDayDetails = async (date) => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const params = new URLSearchParams({ date: dateStr });

            if (selectedFilters.faculty) {
                const selectedFaculty = faculties.find(f => f.fullName === selectedFilters.faculty);
                if (selectedFaculty) params.append('faculty_id', selectedFaculty.ID);
            } else if (selectedFilters.room) {
                params.append('room', selectedFilters.room);
            } else if (selectedFilters.course && selectedFilters.batch && selectedFilters.semester) {
                const selectedCourse = courses.find(c => c.Name === selectedFilters.course);
                 const [yearStr, sectionName] = selectedFilters.batch.split('-');
                if (selectedCourse) {
                    params.append('course_id', selectedCourse.ID);
                    params.append('year', yearStr);
                    params.append('section', sectionName);
                    params.append('semester', romanToInteger(selectedFilters.semester));
                }
            }

            const response = await fetchWithAuth(`${API_ENDPOINTS.CALENDAR_DAY}?${params}`);
            setDayDetails(Array.isArray(response) ? response : (response.data || []));
            setError(null);
        } catch (err) {
            console.error("Error fetching day details:", err);
            setError(`Failed to fetch day details: ${err.message}`);
            setDayDetails([]);
        } finally {
            setLoading(false);
        }
    };

    const updateLectureStatus = async (lectureId, date, newStatus) => {
        // This function needs to be adapted to your session update logic
        console.log("Updating status for lecture:", lectureId, "on", date, "to", newStatus);
        // Assuming you have a session update endpoint
    };

    const handleFilterChange = (filterName, value) => {
        setSelectedFilters(prev => {
            const newFilters = { ...prev };
             if (filterName === 'course') {
                return { course: value, batch: null, semester: null, faculty: null, room: null };
            }
            if (filterName === 'batch') {
                return { ...prev, batch: value, semester: null, faculty: null, room: null };
            }
            if (filterName === 'faculty') {
                return { course: null, batch: null, semester: null, faculty: value, room: null };
            }
            if (filterName === 'room') {
                return { course: null, batch: null, semester: null, faculty: null, room: value };
            }
            newFilters[filterName] = value;
            return newFilters;
        });
    };

    const getFilteredBatches = () => {
        if (!selectedFilters.course) return [];
        const selectedCourse = courses.find(course => course.Name === selectedFilters.course);
        if (!selectedCourse) return [];
        return batches
            .filter(batch => batch.CourseID === selectedCourse.ID)
            .flatMap(batch =>
                Array.isArray(batch.Sections)
                ? batch.Sections.map(section => ({
                    value: `${batch.EntryYear}-${section.Name}`,
                    label: `Batch ${batch.EntryYear} - Section ${section.Name}`
                    }))
                : []
            )
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    const romanToInteger = (roman) => {
        if (!roman) return 0;
        if (!isNaN(roman)) return parseInt(roman, 10);
        const romanMap = { 'I': 1, 'V': 5, 'X': 10 };
        let result = 0;
        for (let i = 0; i < roman.length; i++) {
            const current = romanMap[roman[i]];
            const next = romanMap[roman[i + 1]];
            if (next && current < next) result -= current;
            else result += current;
        }
        return result;
    };

    const handleStatusClick = useCallback((lecture) => {
        setSelectedLecture({ ...lecture, date: selectedDate.toISOString().split('T')[0] });
        setShowStatusModal(true);
    }, [selectedDate]);

    const closeStatusModal = useCallback(() => {
        setShowStatusModal(false);
        setSelectedLecture(null);
    }, []);

    const getDaysInMonth = useCallback((date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }
        return days;
    }, []);

    const formatDateKey = useCallback((date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const getClassesForDate = useCallback((date) => {
        const dateKey = formatDateKey(date);
        const dateData = monthSummary.find((item) => item.date === dateKey);
        if (!dateData) return { total_held: 0, total_cancelled: 0, no_data: 0 };
        return {
            total_held: dateData.total_held || 0,
            total_cancelled: dateData.total_cancelled || 0,
            no_data: dateData.no_data || 0,
        };
    }, [monthSummary, formatDateKey]);

    const handleDateClick = useCallback((date) => {
        setSelectedDate(date);
        setShowModal(true);
    }, []);

    const handlePrevMonth = useCallback(() => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }, [currentDate]);

    const handleNextMonth = useCallback(() => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }, [currentDate]);

    const closeModal = useCallback(() => {
        setShowModal(false);
        setSelectedDate(null);
    }, []);

    const getSemesterDisplayName = useCallback((val) => {
        if (typeof val === 'number') {
            const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
            return `Semester ${numerals[val] || val}`;
        }
        return `Semester ${val}`;
    }, []);

    const days = useMemo(() => getDaysInMonth(currentDate), [currentDate, getDaysInMonth]);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (initialLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
                <Spinner />
                <p className="mt-4 text-lg text-gray-600">Preparing Calendar...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-800 flex items-center gap-2 sm:gap-3">
                            Attendance Calendar
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                         <SearchableSelect
                            label="Course"
                            value={selectedFilters.course}
                            options={courses.map(c => ({ value: c.Name, label: c.Name }))}
                            onSelect={(value) => handleFilterChange('course', value)}
                            placeholder="Filter by Course"
                            disabled={!!selectedFilters.faculty || !!selectedFilters.room}
                        />
                         <SearchableSelect
                            label="Batch"
                            value={selectedFilters.batch}
                            options={getFilteredBatches()}
                            onSelect={(value) => handleFilterChange('batch', value)}
                            placeholder="Filter by Batch"
                            disabled={!selectedFilters.course || !!selectedFilters.faculty || !!selectedFilters.room}
                        />
                         <SearchableSelect
                            label="Semester"
                            value={selectedFilters.semester}
                            options={semesters.map(s => ({ value: s.id, label: s.id }))}
                            onSelect={(value) => handleFilterChange('semester', value)}
                            placeholder="Filter by Semester"
                            disabled={!selectedFilters.batch || !!selectedFilters.faculty || !!selectedFilters.room}
                        />
                    </div>

                    <div className="flex items-center my-4">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-500 font-semibold">OR</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <SearchableSelect
                            label="Faculty"
                            value={selectedFilters.faculty}
                            options={faculties.map(f => ({ value: f.fullName, label: f.fullName }))}
                            onSelect={(value) => handleFilterChange('faculty', value)}
                            placeholder="Filter by Faculty"
                            disabled={!!selectedFilters.course || !!selectedFilters.room}
                        />
                        <SearchableSelect
                            label="Room"
                            value={selectedFilters.room}
                            options={rooms.map(r => ({ value: r.Name, label: r.Name }))}
                            onSelect={(value) => handleFilterChange('room', value)}
                            placeholder="Filter by Room"
                            disabled={!!selectedFilters.course || !!selectedFilters.faculty}
                        />
                    </div>


                    <div className="flex items-center justify-between mb-6">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-300">
                            <ChevronLeft className="w-6 h-6 text-gray-700" />
                        </button>
                        <h2 className="text-3xl font-semibold text-gray-800 tracking-wide">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-300">
                            <ChevronRight className="w-6 h-6 text-gray-700" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 p-4 bg-gray-50/80 rounded-lg justify-center">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div><span className="text-sm text-gray-700">Held</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div><span className="text-sm text-gray-700">Canceled</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-300 rounded-full shadow-sm"></div><span className="text-sm text-gray-700">No Entry</span></div>
                    </div>

                    <div className="relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
                                <Spinner />
                            </div>
                        )}
                        <div className="grid grid-cols-7 gap-1">
                            {dayNames.map(day => <div key={day} className="p-3 text-center font-bold text-gray-600 bg-gray-100/80 rounded-t-lg">{day}</div>)}
                            {days.map((day, index) => {
                                if (!day) return <div key={index} className="bg-gray-50/50 rounded-lg"></div>;
                                const classes = getClassesForDate(day);
                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <CalendarDay
                                        key={index}
                                        day={day}
                                        classes={classes}
                                        isToday={isToday}
                                        onClick={handleDateClick}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {showModal && selectedDate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
                    <div ref={modalRef} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-800">
                                    <span className="font-normal">{selectedDate.toLocaleDateString("en-US", { weekday: "long" })},</span> {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                                </h3>
                                <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6 text-gray-600" /></button>
                            </div>
                        </div>
                        <div className="p-6">
                            {loading ? (
                                <div className="text-center py-12 flex flex-col items-center"><Spinner /><p className="mt-4 text-gray-600">Loading Details...</p></div>
                            ) : dayDetails.length > 0 ? (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-800 text-xl pb-2 border-b-2 border-blue-200">Class Details</h4>
                                    {dayDetails.map((detail, index) => (
                                        <div key={index} className={`border-l-4 rounded-xl p-6 mb-4 transition-all duration-300 hover:shadow-lg ${detail.status === 'held' ? 'border-green-400 bg-green-50 hover:bg-green-100' : detail.status === 'cancelled' ? 'border-red-400 bg-red-50 hover:bg-red-100' : 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    {detail.status === 'held' ? <Check className="w-5 h-5 text-green-600" /> : detail.status === 'cancelled' ? <X className="w-5 h-5 text-red-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                                                    <h3 className="text-lg font-semibold text-gray-800">{detail.subject || 'Subject N/A'}</h3>
                                                </div>
                                                <button onClick={() => handleStatusClick(detail)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${detail.status === 'held' ? 'bg-green-100 text-green-800 hover:bg-green-200' : detail.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`} title="Click to change status">
                                                    <FaEdit className="text-current" />
                                                    {detail.status === 'held' ? 'Class Taken' : detail.status === 'cancelled' ? 'Class Missed' : 'No Entry'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-500" /><span className="text-gray-600">Faculty:</span><span className="font-medium text-gray-800">{detail.faculty || 'N/A'}</span></div>
                                                <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-500" /><span className="text-gray-600">Course:</span><span className="font-medium text-gray-800">{detail.course_name || 'N/A'}</span></div>
                                                <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500" /><span className="text-gray-600">Semester:</span><span className="font-medium text-gray-800">{detail.semester ? getSemesterDisplayName(detail.semester) : 'N/A'}</span></div>
                                                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /><span className="text-gray-600">Time:</span><div className="font-medium text-gray-800">{detail.start_time && detail.end_time ? `${detail.start_time}-${detail.end_time}`: 'N/A'}</div></div>
                                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /><span className="text-gray-600">Room:</span><div className="font-medium text-gray-800">{detail.room || 'N/A'}</div></div>
                                                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /><span className="text-gray-600">Batch:</span><div className="font-medium text-gray-800">{`${detail.course_name || ''} ${detail.batch_year || ''} ${detail.batch_section || ''}`.trim() || 'N/A'}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500"><Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" /><h3 className="text-xl font-semibold">No Classes Scheduled</h3><p>There is no class data available for this day with the current filters.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showStatusModal && selectedLecture && (
                <StatusModal
                    lecture={selectedLecture}
                    onClose={closeStatusModal}
                    onUpdate={updateLectureStatus}
                />
            )}
        </div>
    );
}

export default ViewTimeTable;
