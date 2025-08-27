import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import SearchableSelect from "../components/SearchableSelect"; // Integrated SearchableSelect
import academicData from "../assets/academicData.json";
import { RefreshCcw } from "lucide-react";
import clsx from 'clsx';

const Spinner = ({ className = "w-12 h-12" }) => (
    <svg className={`animate-spin text-blue-500 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// Helper to format a date object or ISO string into HH:MM
const formatTimeToHHMM = (timeInput) => {
    if (!timeInput) return "00:00";
    try {
        const date = new Date(timeInput);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error("Could not parse time:", timeInput, error);
        return "00:00";
    }
};

// Helper to convert HH:MM string to total minutes for easy comparison
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Sorts time slots chronologically
const sortTimeSlots = (slots) => {
    if (!Array.isArray(slots)) return [];
    return [...slots].sort((a, b) => {
        const [startA] = a.split('-');
        const [startB] = b.split('-');
        return timeToMinutes(startA) - timeToMinutes(startB);
    });
};

// Helper function to get the correct day of week index for the backend
const getDayOfWeekIndex = (dayName) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const index = days.indexOf(dayName);
    if (index === -1) {
      return 0;
    }
    // Custom mapping: Sunday=1, Monday=2, Tuesday=3...
    return index + 1;
  };

// Helper to group consecutive lectures for display
const groupConsecutiveTimeSlots = (gridData, days, timeSlots) => {
    const groupedData = {};
    days.forEach(day => {
        let currentGroup = null;
        const sortedTimeSlots = [...timeSlots].sort();

        sortedTimeSlots.forEach((time, timeIndex) => {
            const key = `${day}-${time}`;
            const cellData = gridData[key];
            const lectures = Array.isArray(cellData) ? cellData : (cellData ? [cellData] : []);
            const lecture = lectures.length > 0 ? lectures[0] : null;

            if (lecture) {
                const groupKey = `${day}-${lecture.subject}-${lecture.faculty}`;
                const prevTimeKey = timeIndex > 0 ? `${day}-${sortedTimeSlots[timeIndex - 1]}` : null;

                if (currentGroup && currentGroup.groupKey === groupKey && groupedData[prevTimeKey]) {
                    currentGroup.timeSlots.push(time);
                    currentGroup.endIndex = timeIndex;
                    groupedData[key] = currentGroup;
                } else {
                    currentGroup = {
                        ...lecture, groupKey,
                        timeSlots: [time],
                        startIndex: timeIndex, endIndex: timeIndex,
                        isGrouped: true,
                    };
                    groupedData[key] = currentGroup;
                }
            } else {
                currentGroup = null;
            }
        });
    });
    return groupedData;
};


const ClassTimeTable = () => {
    // State for fetched data
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [subjects, setSubjects] = useState([]);


    // State for timetable display
    const [gridData, setGridData] = useState({});
    const [allTimeSlots, setAllTimeSlots] = useState([]);
    const [lectures, setLectures] = useState([]);


    // State for user filters
    const [selectedFilters, setSelectedFilters] = useState({
        course: null,
        batch: null,
        semester: null,
        faculty: null,
        room: null
    });

    // Loading and error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isLoadingLectures, setIsLoadingLectures] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);


    // API Endpoints
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    const API_ENDPOINTS = {
        GET_COURSE: `${API_BASE_URL}/course`,
        GET_BATCH: `${API_BASE_URL}/batch`,
        GET_SUBJECT: `${API_BASE_URL}/subject`,
        GET_FACULTY: `${API_BASE_URL}/faculty`,
        GET_ROOM: `${API_BASE_URL}/room`,
        LECTURE_QUERY: `${API_BASE_URL}/lecture/query`,
    };

    // Fetch initial data on component mount
    useEffect(() => {
        fetchAllData();
    }, []);


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

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [coursesData, batchesData, facultiesData, roomsData, subjectsData] = await Promise.all([
                fetchWithAuth(API_ENDPOINTS.GET_COURSE),
                fetchWithAuth(API_ENDPOINTS.GET_BATCH),
                fetchWithAuth(API_ENDPOINTS.GET_FACULTY),
                fetchWithAuth(API_ENDPOINTS.GET_ROOM),
                fetchWithAuth(API_ENDPOINTS.GET_SUBJECT)
            ]);
            setCourses(coursesData || []);
            setBatches(batchesData || []);
            setRooms(roomsData || []);
            setSemesters(academicData.semesters || []);
            setSubjects(subjectsData || []);
            const facultiesWithFullName = (facultiesData || []).map(f => ({ ...f, fullName: `${f.FirstName || ''} ${f.LastName || ''}`.trim() }));
            setFaculties(facultiesWithFullName);
        } catch (err) {
            setError('Failed to fetch initial data. Please ensure you are logged in and the server is running.');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const fetchLectures = async () => {
        setIsLoadingLectures(true);
        setError(null);
        setGridData({});
        setLectures([]);
        setAllTimeSlots(sortTimeSlots(academicData.timeSlots));

        try {
            const params = new URLSearchParams();

            if (selectedFilters.faculty) {
                const selectedFaculty = faculties.find(f => f.fullName === selectedFilters.faculty);
                if (selectedFaculty) params.append('faculty_id', selectedFaculty.ID);
            } else if (selectedFilters.room) {
                // FIX: Send the room name string directly as the 'room' parameter.
                if (selectedFilters.room) {
                    params.append('room', selectedFilters.room);
                } else {
                    console.error("Room not found for selected name:", selectedFilters.room);
                    setIsLoadingLectures(false);
                    return;
                }
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

            if ([...params].length === 0) {
                setIsLoadingLectures(false);
                return;
            }

            console.log("Fetching lectures with parameters:", params.toString());
            const fetchedLectures = await fetchWithAuth(`${API_ENDPOINTS.LECTURE_QUERY}?${params}`);
            console.log("Fetched lectures response:", fetchedLectures);

            if (fetchedLectures && fetchedLectures.length > 0) {
                // FIX: Filter the lectures on the client-side based on the room filter.
                // This is a reliable fallback if the backend query logic is flawed.
                if (selectedFilters.room) {
                    const filteredByRoom = fetchedLectures.filter(lecture => lecture.Room === selectedFilters.room);
                    setLectures(filteredByRoom);
                    processFetchedLectures(filteredByRoom);
                } else {
                    setLectures(fetchedLectures);
                    processFetchedLectures(fetchedLectures);
                }
            } else {
                setLectures([]);
                setGridData({});
            }

        } catch (err) {
            setError('Failed to fetch timetable for the selected criteria.');
            console.error('Error fetching lectures:', err);
        } finally {
            setIsLoadingLectures(false);
        }
    };

    const processFetchedLectures = (lecturesToProcess) => {
        const newGridData = {};
        const usedTimeSlots = new Set(academicData.timeSlots);
        const days = academicData.days;

        lecturesToProcess.forEach(lecture => {
            if (!lecture?.Timeslot?.DayOfWeek || !lecture?.Subject?.Name || !lecture?.Faculty?.FirstName) {
                console.warn('Skipping incomplete lecture data:', lecture);
                return;
            }

            try {
                // Correctly map the backend's day_of_week index to the frontend's day name
                const dayIndex = lecture.Timeslot.DayOfWeek - 1;
                const day = days[dayIndex];
                const startTime = formatTimeToHHMM(lecture.Timeslot.StartTime);
                const endTime = formatTimeToHHMM(lecture.Timeslot.EndTime);

                if (!day) {
                    console.warn('Skipping lecture due to invalid DayOfWeek:', lecture);
                    return;
                }

                const timeSlot = `${startTime}-${endTime}`;
                usedTimeSlots.add(timeSlot);
                const key = `${day}-${timeSlot}`;

                const lectureData = {
                    id: lecture.ID,
                    subject: lecture.Subject.Name,
                    code: lecture.Subject.Code || '',
                    faculty: `${lecture.Faculty.FirstName} ${lecture.Faculty.LastName || ''}`.trim(),
                    room: lecture.Room || ''
                };

                if (!newGridData[key]) {
                    newGridData[key] = [];
                }
                newGridData[key].push(lectureData);
            } catch (processingError) {
                console.error('Failed to process a single lecture, skipping:', lecture, processingError);
            }
        });

        setGridData(newGridData);
        setAllTimeSlots(sortTimeSlots(Array.from(usedTimeSlots)));
    };

    const handleFilterChange = (filterName, value) => {
        const newFilters = { ...selectedFilters };

        if (['course', 'batch', 'semester'].includes(filterName)) {
            newFilters.faculty = null;
            newFilters.room = null;
        } else if (filterName === 'faculty' || filterName === 'room') {
            newFilters.course = null;
            newFilters.batch = null;
            newFilters.semester = null;
        }

        newFilters[filterName] = value;
        setSelectedFilters(newFilters);
    };

    const handleGenerateTimetable = () => {
        if ((selectedFilters.course && selectedFilters.batch && selectedFilters.semester) || selectedFilters.faculty || selectedFilters.room) {
            fetchLectures();
        } else {
            alert("Please select a valid filter combination: (Course + Batch + Semester), or Faculty, or Room.");
        }
    };

    const handleReset = () => {
        setSelectedFilters({ course: null, batch: null, semester: null, faculty: null, room: null });
        setGridData({});
        setLectures([]);
        setAllTimeSlots(sortTimeSlots(academicData.timeSlots));
    };

    const getFilteredBatches = () => {
        if (!selectedFilters.course || !courses.length || !batches.length) return [];
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

    // Filter out Sunday from the days array for display purposes
    const daysToDisplay = academicData.days.filter(day => day !== 'Sunday');

    if (initialLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
                <Spinner />
                <p className="mt-4 text-lg text-gray-600">Loading initial data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {error && (
                <div className="p-4 text-center text-red-600 bg-red-100 rounded-md m-4">{error}</div>
            )}

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 rounded-t-2xl">
                        <h1 className="text-xl font-bold text-white">View Timetable</h1>
                        <p className="text-indigo-100 text-sm mt-1">Filter and view academic schedules</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                            <div className="space-y-2 z-30">
                                <label className="block text-sm font-semibold text-gray-700">Course</label>
                                <SearchableSelect
                                    value={selectedFilters.course}
                                    onSelect={(value) => handleFilterChange('course', value)}
                                    placeholder="Select course"
                                    options={courses.map(c => ({ value: c.Name, label: c.Name }))}
                                    disabled={loading || !!selectedFilters.faculty || !!selectedFilters.room}
                                />
                            </div>
                            <div className="space-y-2 z-20">
                                <label className="block text-sm font-semibold text-gray-700">Batch</label>
                                <SearchableSelect
                                    value={selectedFilters.batch}
                                    onSelect={(value) => handleFilterChange('batch', value)}
                                    placeholder="Select batch"
                                    options={getFilteredBatches()}
                                    disabled={loading || !selectedFilters.course || !!selectedFilters.faculty || !!selectedFilters.room}
                                />
                            </div>
                            <div className="space-y-2 z-10">
                                <label className="block text-sm font-semibold text-gray-700">Semester</label>
                                <SearchableSelect
                                    value={selectedFilters.semester}
                                    onSelect={(value) => handleFilterChange('semester', value)}
                                    placeholder="Select semester"
                                    options={semesters.map(s => ({ value: s.id, label: s.id }))}
                                    disabled={loading || !selectedFilters.batch || !!selectedFilters.faculty || !!selectedFilters.room}
                                />
                            </div>
                        </div>
                        <div className="flex items-center my-4">
                            <div className="flex-grow border-t border-gray-300"></div>
                            <span className="flex-shrink mx-4 text-gray-500 font-semibold">OR</span>
                            <div className="flex-grow border-t border-gray-300"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Faculty</label>
                                <SearchableSelect
                                    value={selectedFilters.faculty}
                                    onSelect={(value) => handleFilterChange('faculty', value)}
                                    placeholder="Select faculty"
                                    options={faculties.map(f => ({ value: f.fullName, label: f.fullName }))}
                                    disabled={loading || !!selectedFilters.course || !!selectedFilters.room}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Room</label>
                                <SearchableSelect
                                    value={selectedFilters.room}
                                    onSelect={(value) => handleFilterChange('room', value)}
                                    placeholder="Select room"
                                    options={rooms.map(r => ({ value: r.Name, label: r.Name }))}
                                    disabled={loading || !!selectedFilters.course || !!selectedFilters.faculty}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <Button
                                className={clsx("w-full sm:w-auto flex-grow h-12 font-semibold rounded-xl shadow-lg transition-all", { "bg-gradient-to-r from-indigo-600 to-blue-600 text-white": (selectedFilters.course && selectedFilters.batch && selectedFilters.semester) || selectedFilters.faculty || selectedFilters.room, "bg-gray-200 text-gray-500 cursor-not-allowed": !((selectedFilters.course && selectedFilters.batch && selectedFilters.semester) || selectedFilters.faculty || selectedFilters.room)})}
                                onClick={handleGenerateTimetable}
                                disabled={!((selectedFilters.course && selectedFilters.batch && selectedFilters.semester) || selectedFilters.faculty || selectedFilters.room) || isLoadingLectures}
                            >
                                {isLoadingLectures ? 'Loading...' : 'Generate Timetable'}
                            </Button>
                            <Button
                                className="w-full sm:w-auto h-12 font-semibold rounded-xl shadow-lg bg-gray-300 hover:bg-gray-400 text-gray-800 flex items-center justify-center gap-2"
                                onClick={handleReset}
                                disabled={loading || isLoadingLectures}
                            >
                                <RefreshCcw size={18} />
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {(isLoadingLectures || loading) && (
                <div className="text-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>
            )}

            {!isLoadingLectures && lectures.length > 0 && (
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="p-3 text-center font-semibold text-gray-600">Day/Time</th>
                                            {allTimeSlots.map((time) => (
                                                <th key={time} className="p-2 text-center font-semibold text-gray-600 min-w-[160px] border-l">
                                                    <span>{time}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {daysToDisplay.map(day => {
                                            const groupedDayData = groupConsecutiveTimeSlots(gridData, [day], allTimeSlots);
                                            return (
                                                <tr key={day} className="border-t">
                                                    <td className="p-3 font-bold text-gray-700 bg-slate-50 text-center border-r">{day}</td>
                                                    {allTimeSlots.map((time) => {
                                                        const cellKey = `${day}-${time}`;
                                                        const lectures = gridData[cellKey] || [];
                                                        const groupInfo = groupedDayData[cellKey];

                                                        if (groupInfo && groupInfo.timeSlots[0] !== time) return null;
                                                        const colSpan = groupInfo ? groupInfo.timeSlots.length : 1;

                                                        return (
                                                            <td key={cellKey} colSpan={colSpan} className="border-l p-2 text-center h-24 align-top">
                                                                {lectures.length > 0 ? (
                                                                    <div className="bg-indigo-100 text-indigo-800 rounded-md p-2 h-full flex flex-col justify-center space-y-1">
                                                                        {lectures.map((lecture, idx) => (
                                                                            <div key={lecture.id || idx}>
                                                                                {idx > 0 && <hr className="my-1 border-indigo-200"/>}
                                                                                <div className="font-bold text-sm">{lecture.subject}</div>
                                                                                <div className="text-xs">{lecture.faculty}</div>
                                                                                <div className="text-xs text-gray-500">{lecture.room}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-300">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isLoadingLectures && !loading && lectures.length === 0 && (selectedFilters.course || selectedFilters.faculty || selectedFilters.room) && (
                <div className="text-center p-8 text-gray-600">No timetable found for the selected criteria.</div>
            )}
        </div>
    );
};

export default ClassTimeTable;
