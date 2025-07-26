import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, RefreshCw, Trash } from "lucide-react";
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

// ✨ NEW: Helper to convert HH:MM string to total minutes for easy comparison
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
        const sortedTimeSlots = [...timeSlots].sort();

        sortedTimeSlots.forEach((time, timeIndex) => {
            const key = `${day}-${time}`;
            const lecture = gridData[key];

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
  const [loadedLectures, setLoadedLectures] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [dialogData, setDialogData] = useState({ subject: "", faculty: "" });
  const [showTimetable, setShowTimetable] = useState(false);
  const [batchDetails, setBatchDetails] = useState({ course: "", batch: "", semester: "" });
  const [isLocked, setIsLocked] = useState(false);
  const [predefinedTimeSlots] = useState(academicData.timeSlots || []);
  const [timeSlots, setTimeSlots] = useState([...predefinedTimeSlots]);
  const [showAddTimeSlotDialog, setShowAddTimeSlotDialog] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [editTimeSlotDialog, setEditTimeSlotDialog] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState({ index: -1, value: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [timetableRoom, setTimetableRoom] = useState("");

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
    if (allDetailsSelected() && courses.length && batches.length) {
      loadExistingLectures();
    } else {
      resetTimetableState();
    }
  }, [batchDetails.course, batchDetails.batch, batchDetails.semester]);

  const fetchWithAuth = async (url, options = {}) => {
    // ... function remains unchanged
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.error}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  };

  const fetchAllData = async () => {
    // ... function remains unchanged
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
    // ... This function now includes the conditional timeslot logic ...
    if (!allDetailsSelected()) return;
    setIsLoading(true);
    try {
      const [yearStr, sectionName] = batchDetails.batch.split('-');
      const selectedCourse = courses.find(c => c.Name === batchDetails.course);
      if (!selectedCourse) {
        resetTimetableState();
        setIsLoading(false);
        return;
      }
      const params = new URLSearchParams({
        course_id: selectedCourse.ID, year: yearStr,
        section: sectionName, semester: romanToInteger(batchDetails.semester),
      });
      const lectures = await fetchWithAuth(`${API_ENDPOINTS.LECTURE_QUERY}?${params}`);
      setLoadedLectures(lectures || []);
      if (lectures && lectures.length > 0) {
        const newGridData = {};
        const usedTimeSlots = new Set();
        lectures.forEach(lecture => {
          if (!lecture.Timeslot || !lecture.Subject || !lecture.Faculty) return;
          const day = academicData.days[lecture.Timeslot.DayOfWeek - 1];
          const startTime = formatTimeToHHMM(lecture.Timeslot.StartTime);
          const endTime = formatTimeToHHMM(lecture.Timeslot.EndTime);
          const timeSlot = `${startTime}-${endTime}`;
          usedTimeSlots.add(timeSlot);
          const key = `${day}-${timeSlot}`;
          newGridData[key] = {
            subject: lecture.Subject.Name,
            faculty: `${lecture.Faculty.FirstName} ${lecture.Faculty.LastName}`.trim(),
          };
        });
        setTimetableRoom(lectures[0].Room || "");
        let finalTimeSlots;
        if (usedTimeSlots.size > 4) {
            finalTimeSlots = Array.from(usedTimeSlots);
        } else {
            const combinedTimeSlots = new Set([...predefinedTimeSlots, ...usedTimeSlots]);
            finalTimeSlots = Array.from(combinedTimeSlots);
        }
        setGridData(newGridData);
        setOriginalGridData(JSON.parse(JSON.stringify(newGridData)));
        setTimeSlots(finalTimeSlots.sort());
      } else {
        resetTimetableState();
      }
    } catch (error) {
      setError("Could not load the timetable. Please try again.");
      resetTimetableState();
    } finally {
      setIsLoading(false);
    }
  };

  const resetTimetableState = () => {
    setGridData({});
    setOriginalGridData({});
    setLoadedLectures([]);
    setTimeSlots([...predefinedTimeSlots]);
    setTimetableRoom("");
  };

  const saveLectures = async () => {
    // ... This optimized function remains unchanged ...
    if (!allDetailsSelected()) { alert('Please select course, batch, and semester.'); return; }
    if (!timetableRoom) { alert('Please select a room for the timetable.'); return; }
    setIsSaving(true);
    const lecturesToDelete = [];
    for (const key in originalGridData) {
        if (!gridData[key]) {
            const [day, timeSlot] = key.split(/-(.+)/);
            const [startTime] = timeSlot.split('-');
            const lectureData = loadedLectures.find(l =>
                l.Timeslot && academicData.days[l.Timeslot.DayOfWeek - 1] === day &&
                formatTimeToHHMM(l.Timeslot.StartTime) === startTime
            );
            if (lectureData) {
                lecturesToDelete.push({
                    timetable_id: lectureData.TimetableID,
                    timeslot_id: lectureData.TimeslotID,
                });
            }
        }
    }
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
    const lecturesToUpsert = [];
    for (const key in gridData) {
        const currentLecture = gridData[key];
        const originalLecture = originalGridData[key];
        if (!originalLecture || JSON.stringify(currentLecture) !== JSON.stringify(originalLecture)) {
            const [day, timeSlot] = key.split(/-(.+)/);
            const [startTime, endTime] = timeSlot.split('-');
            const subject = subjects.find(s => s.Name === currentLecture.subject);
            const faculty = faculties.find(f => f.fullName === currentLecture.faculty);
            if (subject && faculty) {
                lecturesToUpsert.push({
                    DayOfWeek: academicData.days.indexOf(day) + 1,
                    StartTime: startTime, EndTime: endTime,
                    SubjectID: subject.ID, FacultyID: faculty.ID,
                    BatchID: parentBatch.ID, SectionID: section.ID,
                    CourseID: selectedCourse.ID, Semester: semesterNumber,
                    Room: timetableRoom,
                });
            }
        }
    }
    try {
        if (lecturesToDelete.length > 0) {
            await Promise.all(lecturesToDelete.map(payload =>
                fetchWithAuth(API_ENDPOINTS.LECTURE, { method: 'DELETE', body: JSON.stringify(payload) })
            ));
        }
        if (lecturesToUpsert.length > 0) {
            await Promise.all(lecturesToUpsert.map(payload =>
                fetchWithAuth(API_ENDPOINTS.LECTURE, { method: 'POST', body: JSON.stringify(payload) })
            ));
        }
        if (lecturesToUpsert.length === 0 && lecturesToDelete.length === 0) {
            alert("No changes to save.");
        } else {
            alert('Timetable synchronized successfully!');
        }
        await loadExistingLectures();
    } catch (error) {
        alert(`Failed to save timetable: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const getFilteredBatches = () => {
    // ... function remains unchanged
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
  };

  const romanToInteger = (roman) => {
    // ... function remains unchanged
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

  const allDetailsSelected = () => batchDetails.course && batchDetails.batch && batchDetails.semester;
  const handleCellClick = (day, time) => { setSelectedCell({ day, time }); setDialogData(gridData[`${day}-${time}`] || { subject: "", faculty: "" }); };
  const handleDialogInputChange = (field, value) => { setDialogData(prev => ({ ...prev, [field]: value })); };
  const handleSaveEntry = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.day}-${selectedCell.time}`;
    const newGridData = { ...gridData };
    if (dialogData.subject && dialogData.faculty) { newGridData[key] = { ...dialogData }; } else { delete newGridData[key]; }
    setGridData(newGridData);
    setSelectedCell(null);
  };
  const handleGenerateTimetable = () => { if (allDetailsSelected()) { setShowTimetable(true); setIsLocked(true); } };
  const handleClearEntry = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.day}-${selectedCell.time}`;
    const newGridData = { ...gridData };
    delete newGridData[key];
    setGridData(newGridData);
    setSelectedCell(null);
  };
  const handleClearAll = () => { if (window.confirm('Are you sure? This will delete all lectures on next save.')) { setGridData({}); } };

  const handleAddTimeSlot = () => {
    const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
    const newSlotStr = newTimeSlot.trim();
    if (!newSlotStr || !timeRegex.test(newSlotStr)) {
      alert("Invalid format. Use HH:MM-HH:MM (e.g., 09:00-10:00)");
      return;
    }

    // ✨ NEW: Frontend validation to prevent overlap
    const [newStartStr, newEndStr] = newSlotStr.split('-');
    const newStart = timeToMinutes(newStartStr);
    const newEnd = timeToMinutes(newEndStr);

    if (newStart >= newEnd) {
      alert("Error: Start time must be before end time.");
      return;
    }

    for (const existingSlot of timeSlots) {
        const [existingStartStr, existingEndStr] = existingSlot.split('-');
        const existingStart = timeToMinutes(existingStartStr);
        const existingEnd = timeToMinutes(existingEndStr);
        if (newStart < existingEnd && existingStart < newEnd) {
            alert(`Error: New time slot ${newSlotStr} overlaps with existing slot ${existingSlot}.`);
            return;
        }
    }

    const newSlots = [...timeSlots, newSlotStr].sort();
    setTimeSlots(newSlots);
    setNewTimeSlot("");
    setShowAddTimeSlotDialog(false);
  };

  const handleEditTimeSlot = (index) => { setEditingTimeSlot({ index, value: timeSlots[index] }); setEditTimeSlotDialog(true); };

  const handleSaveEditTimeSlot = () => {
    const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
    const { index, value } = editingTimeSlot;
    if (!value.trim() || !timeRegex.test(value.trim())) {
      alert("Invalid format. Use HH:MM-HH:MM");
      return;
    }

    // ✨ NEW: Frontend validation for editing
    const [newStartStr, newEndStr] = value.trim().split('-');
    const newStart = timeToMinutes(newStartStr);
    const newEnd = timeToMinutes(newEndStr);

    if (newStart >= newEnd) {
        alert("Error: Start time must be before end time.");
        return;
    }

    for (let i = 0; i < timeSlots.length; i++) {
        if (i === index) continue; // Skip self-comparison
        const existingSlot = timeSlots[i];
        const [existingStartStr, existingEndStr] = existingSlot.split('-');
        const existingStart = timeToMinutes(existingStartStr);
        const existingEnd = timeToMinutes(existingEndStr);

        if (newStart < existingEnd && existingStart < newEnd) {
            alert(`Error: Edited slot ${value} overlaps with existing slot ${existingSlot}.`);
            return;
        }
    }

    const newSlots = [...timeSlots];
    newSlots[index] = value.trim();
    setTimeSlots(newSlots.sort());
    setEditTimeSlotDialog(false);
  };

  const handleDeleteTimeSlot = (indexToDelete) => {
    if (window.confirm("This will remove all lectures in this column and delete them on the next save. Continue?")) {
      const slotToDelete = timeSlots[indexToDelete];
      const newGridData = Object.fromEntries(Object.entries(gridData).filter(([key]) => !key.endsWith(slotToDelete)));
      setGridData(newGridData);
      setTimeSlots(timeSlots.filter((_, i) => i !== indexToDelete));
    }
  };

  const refresh = () => window.location.reload();
  const filteredBatches = getFilteredBatches();

  return (
    <div className="min-h-screen bg-slate-50">
      {error && (<div className="p-4 text-center text-red-600 bg-red-100 rounded-md m-4">{error}</div>)}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="ml-4 text-gray-700 font-medium">Loading Data...</p>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Timetable Generator</h1>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select disabled={isLocked || isLoading} value={batchDetails.course || ""} onValueChange={(value) => { setBatchDetails({ course: value, batch: "", semester: "" }); setShowTimetable(false); setIsLocked(false); }}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{(courses || []).map((c) => (<SelectItem key={c.ID} value={c.Name}>{c.Name}</SelectItem>))}</SelectContent>
              </Select>
              <Select disabled={isLocked || isLoading || !batchDetails.course} value={batchDetails.batch || ""} onValueChange={(value) => { setBatchDetails(p => ({ ...p, batch: value, semester: "" })); setShowTimetable(false); setIsLocked(false); }}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>{filteredBatches.map((b) => (<SelectItem key={b.uniqueId} value={b.uniqueId}>{b.display}</SelectItem>))}</SelectContent>
              </Select>
              <Select disabled={isLocked || isLoading || !batchDetails.batch} value={batchDetails.semester || ""} onValueChange={(value) => { setBatchDetails(p => ({ ...p, semester: value })); setShowTimetable(false); setIsLocked(false); }}>
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>{(semesters || []).map((s) => (<SelectItem key={s.id} value={s.id}>{s.id}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="mt-8">
              <Button className="w-full h-12" onClick={handleGenerateTimetable} disabled={!allDetailsSelected() || isLoading}>Generate Timetable Grid</Button>
            </div>
          </div>
        </div>
      </div>

      {showTimetable && !isLoading && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div className="flex-grow sm:flex-grow-0">
                        <Select value={timetableRoom} onValueChange={setTimetableRoom}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select Room..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(rooms || []).map(r => (
                                    <SelectItem key={r.ID} value={r.Name}>{r.Name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button onClick={() => setShowAddTimeSlotDialog(true)} variant="outline"><Plus size={16} className="mr-2"/>Add Time Slot</Button>
                        <Button onClick={saveLectures} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white"><Save size={16} className="mr-2"/>{isSaving ? "Saving..." : "Save Timetable"}</Button>
                        <Button onClick={refresh} variant="outline"><RefreshCw size={16} className="mr-2"/>Refresh</Button>
                        <Button onClick={handleClearAll} variant="destructive"><Trash size={16} className="mr-2"/>Clear All</Button>
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
                                            <button onClick={() => handleEditTimeSlot(index)} className="text-blue-600 hover:text-blue-800"><Edit size={14}/></button>
                                            <button onClick={() => handleDeleteTimeSlot(index)} className="text-red-600 hover:text-red-800"><Trash2 size={14}/></button>
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
                                                    <div className="bg-indigo-100 text-indigo-800 rounded-md p-2 h-full flex flex-col justify-center">
                                                        <div className="font-bold text-sm">{lecture.subject}</div>
                                                        <div className="text-xs">{lecture.faculty}</div>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Add/Edit Class</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label>Subject</label>
              <Select onValueChange={(value) => handleDialogInputChange("subject", value)} value={dialogData.subject || ""}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{(subjects || []).map(s => <SelectItem key={s.ID} value={s.Name}>{s.Name} ({s.Code})</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <label>Faculty</label>
              <Select onValueChange={(value) => handleDialogInputChange("faculty", value)} value={dialogData.faculty || ""}><SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger><SelectContent>{(faculties || []).map(f => (<SelectItem key={f.ID} value={f.fullName}>{f.fullName}</SelectItem>))}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row sm:items-center">
            <Button variant="destructive" onClick={handleClearEntry} className="w-full sm:w-auto">Clear Entry</Button>
            <div className="flex gap-2 justify-end w-full sm:w-auto">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSaveEntry} disabled={!dialogData.subject || !dialogData.faculty}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTimeSlotDialog} onOpenChange={setShowAddTimeSlotDialog}>
          <DialogContent><DialogHeader><DialogTitle>Add New Time Slot</DialogTitle></DialogHeader>
            <div className="py-4"><Input value={newTimeSlot} onChange={e => setNewTimeSlot(e.target.value)} placeholder="HH:MM-HH:MM (e.g., 09:00-10:00)"/></div>
            <DialogFooter><Button onClick={handleAddTimeSlot}>Add Slot</Button></DialogFooter>
          </DialogContent>
      </Dialog>
      <Dialog open={editTimeSlotDialog} onOpenChange={setEditTimeSlotDialog}>
          <DialogContent><DialogHeader><DialogTitle>Edit Time Slot</DialogTitle></DialogHeader>
            <div className="py-4"><Input value={editingTimeSlot.value} onChange={e => setEditingTimeSlot({...editingTimeSlot, value: e.target.value})} placeholder="HH:MM-HH:MM"/></div>
            <DialogFooter><Button onClick={handleSaveEditTimeSlot}>Save Changes</Button></DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateTable;
