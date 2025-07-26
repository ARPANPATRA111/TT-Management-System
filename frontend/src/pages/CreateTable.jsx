import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import SearchableSelect from "../components/SearchableSelect";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, RefreshCw, Trash } from "lucide-react";
import academicData from "../assets/academicData.json";

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
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  } catch {
    return 0;
  }
};

// Helper function to group consecutive lectures
const groupConsecutiveTimeSlots = (gridData, days, timeSlots) => {
  const groupedData = {};
  days.forEach(day => {
    let currentGroup = null;
    const sortedTimeSlots = [...timeSlots].sort((a, b) => timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]));

    sortedTimeSlots.forEach((time, timeIndex) => {
      const key = `${day}-${time}`;
      const cellData = gridData[key];
      const lecture = cellData;

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


const CreateTable = () => {
  // ... state declarations ...
  const [gridData, setGridData] = useState({});
  const [originalGridData, setOriginalGridData] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [dialogData, setDialogData] = useState({ subject: "", code: "", faculty: "", room: "" });
  const [showTimetable, setShowTimetable] = useState(false);
  const [batchDetails, setBatchDetails] = useState({ course: "", batch: "", semester: "" });
  const [isLocked, setIsLocked] = useState(false);
  const [predefinedTimeSlots] = useState(academicData.timeSlots || []);
  const [timeSlots, setTimeSlots] = useState([...predefinedTimeSlots]);
  const [showAddTimeSlotDialog, setShowAddTimeSlotDialog] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [defaultRoom, setDefaultRoom] = useState("");

  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [rooms, setRooms] = useState([]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const API_ENDPOINTS = {
    GET_COURSE: `${API_BASE_URL}/course`,
    GET_BATCH: `${API_BASE_URL}/batch`,
    GET_SUBJECT: `${API_BASE_URL}/subject`,
    GET_FACULTY: `${API_BASE_URL}/faculty`,
    GET_ROOM: `${API_BASE_URL}/room`,
    LECTURE: `${API_BASE_URL}/lecture`,
    LECTURE_QUERY: `${API_BASE_URL}/lecture/query`,
  };

  useEffect(() => { fetchAllData(); }, []);
  useEffect(() => {
    if (batchDetails.course && batchDetails.batch && batchDetails.semester) {
      loadExistingLectures();
    } else {
      resetTimetableState();
    }
  }, [batchDetails.course, batchDetails.batch, batchDetails.semester]);

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
    setIsLoading(true);
    setError(null);
    try {
      const [coursesData, batchesData, subjectsData, facultiesData, roomsData] = await Promise.all([
        fetchWithAuth(API_ENDPOINTS.GET_COURSE),
        fetchWithAuth(API_ENDPOINTS.GET_BATCH),
        fetchWithAuth(API_ENDPOINTS.GET_SUBJECT),
        fetchWithAuth(API_ENDPOINTS.GET_FACULTY),
        fetchWithAuth(API_ENDPOINTS.GET_ROOM),
      ]);
      setCourses(coursesData || []);
      setBatches(batchesData || []);
      setSubjects(subjectsData || []);
      setRooms(roomsData || []);
      setSemesters(academicData.semesters || []);
      const facultiesWithFullName = (facultiesData || []).map(f => ({ ...f, fullName: `${f.FirstName || ''} ${f.LastName || ''}`.trim() }));
      setFaculties(facultiesWithFullName);
    } catch (err) {
      setError('Failed to fetch initial data. Please ensure you are logged in and the server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingLectures = async () => {
    if (!allDetailsSelected()) return;
    setIsLoading(true);
    resetTimetableState();
    try {
      const [yearStr, sectionName] = batchDetails.batch.split('-');
      const selectedCourse = courses.find(c => c.Name === batchDetails.course);
      if (!selectedCourse) {
        setIsLoading(false);
        return;
      }
      const params = new URLSearchParams({
        course_id: selectedCourse.ID,
        year: yearStr,
        section: sectionName,
        semester: romanToInteger(batchDetails.semester),
      });
      const lectures = await fetchWithAuth(`${API_ENDPOINTS.LECTURE_QUERY}?${params}`);

      if (lectures && Array.isArray(lectures) && lectures.length > 0) {
        const newGridData = {};
        const usedTimeSlots = new Set();
        let mostRecentRoom = "";

        lectures.forEach(lecture => {
          if (!lecture?.Timeslot?.DayOfWeek || !lecture?.Subject?.Name || !lecture?.Faculty?.FirstName) {
            console.warn('Skipping incomplete lecture data:', lecture);
            return;
          }

          try {
            const day = academicData.days[lecture.Timeslot.DayOfWeek - 1];
            const startTime = formatTimeToHHMM(lecture.Timeslot.StartTime);
            const endTime = formatTimeToHHMM(lecture.Timeslot.EndTime);

            if (!day) {
              console.warn('Skipping lecture due to invalid DayOfWeek:', lecture);
              return;
            }

            const timeSlot = `${startTime}-${endTime}`;
            usedTimeSlots.add(timeSlot);
            const key = `${day}-${timeSlot}`;

            newGridData[key] = {
              timetableId: lecture.TimetableID,
              timeslotId: lecture.TimeslotID,
              subject: lecture.Subject.Name,
              code: lecture.Subject.Code || '',
              faculty: `${lecture.Faculty.FirstName} ${lecture.Faculty.LastName || ''}`.trim(),
              room: lecture.Room || '',
            };

            if (lecture.Room) mostRecentRoom = lecture.Room;

          } catch (processingError) {
            console.error('Failed to process a single lecture, skipping:', lecture, processingError);
          }
        });

        if (mostRecentRoom) setDefaultRoom(mostRecentRoom);

        const combinedTimeSlots = new Set([...predefinedTimeSlots, ...usedTimeSlots]);
        const finalTimeSlots = sortTimeSlots(Array.from(combinedTimeSlots));

        setGridData(newGridData);
        setOriginalGridData(JSON.parse(JSON.stringify(newGridData)));
        setTimeSlots(finalTimeSlots);
      }
    } catch (error) {
      setError("Could not load the timetable. Please try again.");
      resetTimetableState();
    } finally {
      setIsLoading(false);
    }
  };

  const saveLectures = async () => {
    if (!allDetailsSelected()) { alert('Please select course, batch, and semester.'); return; }
    setIsSaving(true);

    const [yearStr, sectionName] = batchDetails.batch.split('-');
    const selectedCourse = courses.find(c => c.Name === batchDetails.course);
    const parentBatch = batches.find(b => b.CourseID === selectedCourse?.ID && b.EntryYear === parseInt(yearStr));
    const section = parentBatch?.Sections?.find(s => s.Name === sectionName);
    const semesterNumber = romanToInteger(batchDetails.semester);

    if (!selectedCourse || !parentBatch || !section) {
      alert('Critical Error: Could not resolve course, batch, or section details.');
      setIsSaving(false);
      return;
    }

    const originalKeys = Object.keys(originalGridData);
    const currentKeys = Object.keys(gridData);

    const lecturesToDelete = originalKeys
      .filter(key => !currentKeys.includes(key))
      .map(key => ({
        timetable_id: originalGridData[key].timetableId,
        timeslot_id: originalGridData[key].timeslotId,
      }));

    const lecturesToUpsert = [];
    for (const key of currentKeys) {
      const currentLecture = gridData[key];
      const originalLecture = originalGridData[key];

      if (!originalLecture ||
        currentLecture.subject !== originalLecture.subject ||
        currentLecture.faculty !== originalLecture.faculty ||
        currentLecture.room !== originalLecture.room) {
        const [day, timeSlot] = key.split(/-(.+)/);
        const [startTime, endTime] = timeSlot.split('-');
        const subject = subjects.find(s => s.Name === currentLecture.subject);
        const faculty = faculties.find(f => f.fullName === currentLecture.faculty);

        if (subject && faculty && currentLecture.room) {
          const payload = {
            DayOfWeek: academicData.days.indexOf(day) + 1,
            StartTime: startTime, EndTime: endTime,
            SubjectID: subject.ID, FacultyID: faculty.ID,
            Room: currentLecture.room,
            BatchID: parentBatch.ID, SectionID: section.ID,
            CourseID: selectedCourse.ID, Semester: semesterNumber,
          };
          lecturesToUpsert.push(payload);
        }
      }
    }

    if (lecturesToUpsert.length === 0 && lecturesToDelete.length === 0) {
      alert("No changes to save.");
      setIsSaving(false);
      return;
    }

    try {
      const deletePromises = lecturesToDelete.map(payload =>
        fetchWithAuth(API_ENDPOINTS.LECTURE, {
          method: 'DELETE',
          body: JSON.stringify(payload),
        })
      );

      const upsertPromises = lecturesToUpsert.map(payload =>
        fetchWithAuth(API_ENDPOINTS.LECTURE, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );

      await Promise.all([...deletePromises, ...upsertPromises]);

      alert('Timetable synchronized successfully!');
      await loadExistingLectures();
    } catch (error) {
      alert(`Failed to save timetable: ${error.message}`);
      console.error("Save error details:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // State and UI Handlers
  const resetTimetableState = () => {
    setGridData({});
    setOriginalGridData({});
    setTimeSlots([...predefinedTimeSlots]);
    setDefaultRoom("");
  };

  const getFilteredBatches = useMemo(() => {
    if (!batchDetails.course || !courses.length || !batches.length) return [];
    const selectedCourse = courses.find(course => course.Name === batchDetails.course);
    if (!selectedCourse) return [];
    return batches
      .filter(batch => batch.CourseID === selectedCourse.ID)
      .flatMap(batch =>
        Array.isArray(batch.Sections)
          ? batch.Sections.map(section => ({
            uniqueId: `${batch.EntryYear}-${section.Name}`,
            display: `Batch ${batch.EntryYear} - Section ${section.Name}`
          }))
          : []
      )
      .sort((a, b) => a.display.localeCompare(b.display));
  }, [batchDetails.course, courses, batches]);

  const getFilteredSubjects = useMemo(() => {
    if (!batchDetails.course) return subjects;
    const selectedCourse = courses.find(course => course.Name === batchDetails.course);
    return selectedCourse ? subjects.filter(subject => subject.CourseID === selectedCourse.ID) : [];
  }, [batchDetails.course, courses, subjects]);

  // Utility Functions
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

  const sortTimeSlots = (slots) => {
    if (!Array.isArray(slots)) return [];
    return [...slots].sort((a, b) => timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]));
  };

  // Event Handlers
  const allDetailsSelected = () => batchDetails.course && batchDetails.batch && batchDetails.semester;

  const handleCellClick = (day, time) => {
    setSelectedCell({ day, time });
    const existingData = gridData[`${day}-${time}`];
    if (existingData) {
      setDialogData(existingData);
    } else {
      setDialogData({ subject: "", code: "", faculty: "", room: defaultRoom });
    }
  };

  const handleDialogInputChange = (field, value) => {
    if (field === "subject") {
      const selectedSubject = getFilteredSubjects.find(sub => sub.Name === value);
      setDialogData(prev => ({ ...prev, subject: value, code: selectedSubject?.Code || "" }));
    } else {
      setDialogData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveEntry = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.day}-${selectedCell.time}`;
    const newGridData = { ...gridData };

    newGridData[key] = { ...dialogData };

    setGridData(newGridData);
    setSelectedCell(null);
  };

  const handleRemoveEntry = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.day}-${selectedCell.time}`;
    const newGridData = { ...gridData };
    delete newGridData[key];
    setGridData(newGridData);
    setSelectedCell(null);
  };

  const handleGenerateTimetable = () => { if (allDetailsSelected()) { setShowTimetable(true); setIsLocked(true); } };
  const handleClearAll = () => { if (window.confirm('Are you sure? This will clear the grid. Click "Save All" to make this permanent.')) { setGridData({}); } };
  const refresh = () => window.location.reload();

  const handleAddTimeSlot = () => {
    const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
    const newSlotStr = newTimeSlot.trim();
    if (!timeRegex.test(newSlotStr)) {
      alert("Invalid format. Use HH:MM-HH:MM");
      return;
    }

    const [newStartStr, newEndStr] = newSlotStr.split('-');
    const newStart = timeToMinutes(newStartStr);
    const newEnd = timeToMinutes(newEndStr);

    if (newStart >= newEnd) {
      alert("Error: Start time must be before end time.");
      return;
    }

    // FIX: Re-added the overlap prevention logic.
    for (const existingSlot of timeSlots) {
      const [existingStartStr, existingEndStr] = existingSlot.split('-');
      const existingStart = timeToMinutes(existingStartStr);
      const existingEnd = timeToMinutes(existingEndStr);
      if (newStart < existingEnd && existingStart < newEnd) {
        alert(`Error: New time slot ${newSlotStr} overlaps with existing slot ${existingSlot}.`);
        return;
      }
    }

    const newSlots = sortTimeSlots([...timeSlots, newSlotStr]);
    setTimeSlots(newSlots);
    setNewTimeSlot("");
    setShowAddTimeSlotDialog(false);
  };

  const handleDeleteTimeSlot = (indexToDelete) => {
    if (window.confirm("This will remove all lectures in this column. Continue?")) {
      const slotToDelete = timeSlots[indexToDelete];
      const newGridData = Object.fromEntries(Object.entries(gridData).filter(([key]) => !key.endsWith(slotToDelete)));
      setGridData(newGridData);
      setTimeSlots(timeSlots.filter((_, i) => i !== indexToDelete));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {error && (<div className="p-4 text-center text-red-600 bg-red-100 rounded-md m-4">{error}</div>)}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <p className="text-gray-700 font-medium">Loading Data...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 rounded-t-2xl">
            <h1 className="text-xl font-bold text-white">Timetable Generator</h1>
            <p className="text-indigo-100 text-sm mt-1">Create and manage your academic schedule</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 z-30">
                <label className="block text-sm font-semibold text-gray-700">Course</label>
                <SearchableSelect
                  disabled={isLoading || isLocked}
                  value={batchDetails.course}
                  onSelect={(value) => { setBatchDetails({ course: value, batch: "", semester: "" }); setShowTimetable(false); setIsLocked(false); }}
                  placeholder="Select course"
                  options={(courses || []).map(c => ({ value: c.Name, label: c.Name }))}
                />
              </div>
              <div className="space-y-2 z-20">
                <label className="block text-sm font-semibold text-gray-700">Batch</label>
                <SearchableSelect
                  disabled={isLoading || isLocked || !batchDetails.course}
                  value={batchDetails.batch}
                  onSelect={(value) => {
                    setBatchDetails(p => ({ ...p, batch: value, semester: "" }));
                    setShowTimetable(false);
                    setIsLocked(false);
                  }}
                  placeholder="Select batch"
                  options={getFilteredBatches.map(b => ({ value: b.uniqueId, label: b.display }))}
                />
              </div>
              <div className="space-y-2 z-10">
                <label className="block text-sm font-semibold text-gray-700">Semester</label>
                <SearchableSelect
                  disabled={isLoading || isLocked || !batchDetails.batch}
                  value={batchDetails.semester}
                  onSelect={(value) => { setBatchDetails(p => ({ ...p, semester: value })); setShowTimetable(false); setIsLocked(false); }}
                  placeholder="Select semester"
                  options={(semesters || []).map(s => ({ value: s.id, label: s.id }))}
                />
              </div>
            </div>
            <div className="mt-8">
              <Button className={`w-full h-12 font-semibold rounded-xl shadow-lg transition-all duration-300 ${allDetailsSelected() && !isLoading ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white transform hover:scale-[1.02]" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`} onClick={handleGenerateTimetable} disabled={!allDetailsSelected() || isLoading}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" /></svg>
                Generate Timetable Grid
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showTimetable && !isLoading && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <div className="flex-1 flex flex-wrap items-center gap-x-6 gap-y-2">
                <h2 className="text-xl font-bold text-indigo-700">Timetable Grid</h2>
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-semibold text-gray-700 whitespace-nowrap">Default Room:</label>
                  <SearchableSelect
                    options={(rooms || []).map(r => ({ value: r.Name, label: r.Name }))}
                    onSelect={(value) => setDefaultRoom(value)}
                    placeholder="Select a room"
                    value={defaultRoom}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => setShowAddTimeSlotDialog(true)} variant="outline"><Plus size={16} className="mr-2" />Add Slot</Button>
                <Button onClick={saveLectures} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white"><Save size={16} className="mr-2" />{isSaving ? "Saving..." : "Save All"}</Button>
                <Button onClick={refresh} variant="outline"><RefreshCw size={16} className="mr-2" />Refresh</Button>
                <Button onClick={handleClearAll} variant="destructive"><Trash size={16} className="mr-2" />Clear All</Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-center font-semibold text-gray-600">Day/Time</th>
                    {timeSlots.map((time, index) => (
                      <th key={time} className="p-2 text-center font-semibold text-gray-600 min-w-[160px] border-l">
                        <div className="flex items-center justify-center gap-2">
                          <span>{time}</span>
                          <button onClick={() => handleDeleteTimeSlot(index)} className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {academicData.days.map(day => {
                    const groupedDayData = groupConsecutiveTimeSlots(gridData, [day], timeSlots);
                    return (
                      <tr key={day} className="border-t">
                        <td className="p-3 font-bold text-gray-700 bg-slate-50 text-center border-r">{day}</td>
                        {timeSlots.map((time) => {
                          const cellKey = `${day}-${time}`;
                          const lecture = gridData[cellKey];
                          const groupInfo = groupedDayData[cellKey];

                          if (groupInfo && groupInfo.timeSlots[0] !== time) return null;
                          const colSpan = groupInfo ? groupInfo.timeSlots.length : 1;

                          return (
                            <td key={cellKey} colSpan={colSpan} className="border-l p-2 text-center cursor-pointer hover:bg-indigo-50/50 h-24 align-top" onClick={() => handleCellClick(day, time)}>
                              {lecture ? (
                                <div className="bg-indigo-100 text-indigo-800 rounded-md p-2 h-full flex flex-col justify-center space-y-1">
                                  <div className="font-bold text-sm">{lecture.subject}</div>
                                  <div className="text-xs">{lecture.faculty}</div>
                                  <div className="text-xs text-gray-500">{lecture.room}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-2xl font-light flex items-center justify-center h-full">+</span>
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
      )}

      <Dialog open={selectedCell !== null} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-indigo-700">
              {gridData[`${selectedCell?.day}-${selectedCell?.time}`] ? 'Edit Lecture' : 'Add Lecture'} - {selectedCell?.day} {selectedCell?.time}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <label className="block text-sm font-semibold text-gray-700">Subject</label>
                <SearchableSelect
                  options={getFilteredSubjects.map(s => ({ value: s.Name, label: `${s.Name} (${s.Code})` }))}
                  onSelect={(value) => handleDialogInputChange("subject", value)}
                  placeholder="Select subject"
                  value={dialogData.subject}
                  disabled={!batchDetails.course}
                />
              </div>
              <div className="space-y-2 w-32">
                <label className="block text-sm font-semibold text-gray-700">Code</label>
                <Input value={dialogData.code || ""} readOnly className="bg-gray-100" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Faculty</label>
              <SearchableSelect options={(faculties || []).map(f => ({ value: f.fullName, label: f.fullName }))} onSelect={(value) => handleDialogInputChange("faculty", value)} value={dialogData.faculty} placeholder="Select faculty" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Room</label>
              <SearchableSelect options={(rooms || []).map(r => ({ value: r.Name, label: r.Name }))} onSelect={(value) => handleDialogInputChange("room", value)} value={dialogData.room} placeholder="Select room" />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between items-center gap-2">
            <Button variant="destructive" onClick={handleRemoveEntry}>
              <Trash2 size={16} className="mr-2" />Remove Lecture
            </Button>

            <div className="flex gap-2">
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveEntry} disabled={!dialogData.subject || !dialogData.faculty || !dialogData.room}>
                Save Lecture
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTimeSlotDialog} onOpenChange={setShowAddTimeSlotDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add New Time Slot</DialogTitle></DialogHeader>
          <div className="py-4"><Input value={newTimeSlot} onChange={e => setNewTimeSlot(e.target.value)} placeholder="HH:MM-HH:MM (e.g., 09:00-10:00)" /></div>
          <DialogFooter><Button onClick={handleAddTimeSlot}>Add Slot</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CreateTable;
