import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Heading from "../components/Heading";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaBook, FaSpinner, FaSearch } from "react-icons/fa";
import { useUserRole } from "../context/UserRoleContext";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const toastCustomStyles = `
  @media (max-width: 480px) {
    .Toastify__toast {
      margin: 20px ;
      width: calc(100% - 40px);
      padding: 14px ;
      border-radius: 8px;
    }
  }
`;

const ManageSubjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [newSubject, setNewSubject] = useState({
        id: "",
        Name: "",
        Code: "",
        CourseID: ""
    });
    const { userRole } = useUserRole();
    const navigate = useNavigate();

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const API_ENDPOINTS = {
        GET_SUBJECTS: `${API_BASE_URL}/subject`,
        GET_COURSES: `${API_BASE_URL}/course`,
        ADD_SUBJECT: `${API_BASE_URL}/subject`,
        DELETE_SUBJECT: (id) => `${API_BASE_URL}/subject/${id}`,
        UPDATE_SUBJECT: (id) => `${API_BASE_URL}/subject/${id}`
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [subjectsResponse, coursesResponse] = await Promise.all([
                fetch(API_ENDPOINTS.GET_SUBJECTS, { credentials: 'include' }),
                fetch(API_ENDPOINTS.GET_COURSES, { credentials: 'include' })
            ]);

            if (!subjectsResponse.ok) throw new Error(`Failed to fetch subjects: ${subjectsResponse.status}`);
            if (!coursesResponse.ok) throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);

            const subjectsData = await subjectsResponse.json();
            const coursesData = await coursesResponse.json();

            setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
            setFilteredSubjects(Array.isArray(subjectsData) ? subjectsData : []);
            setCourses(Array.isArray(coursesData) ? coursesData : []);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const results = subjects.filter(subject =>
            (subject.Name && subject.Name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (subject.Code && subject.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (subject.Course && subject.Course.Name && subject.Course.Name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (subject.Course && subject.Course.Code && subject.Course.Code.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredSubjects(results);
    }, [searchTerm, subjects]);

    const handleSaveSubject = async () => {
        if (!newSubject.Name.trim() || !newSubject.Code.trim() || !newSubject.CourseID) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const subjectData = {
                Name: newSubject.Name.trim(),
                Code: newSubject.Code.trim().toUpperCase(),
                CourseID: Number(newSubject.CourseID)
            };

            const endpoint = isEditing
                ? API_ENDPOINTS.UPDATE_SUBJECT(newSubject.id)
                : API_ENDPOINTS.ADD_SUBJECT;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(subjectData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'add'} subject`);
            }

            await fetchData();
            handleCancel();
            toast.success(`Subject ${isEditing ? 'updated' : 'added'} successfully!`);

        } catch (err) {
            console.error('Error saving subject:', err);
            toast.error(`Failed to save subject: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        toast.info(
            <div>
                <div className="mb-2">Are you sure you want to delete this subject?</div>
                <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={() => { toast.dismiss(); performDelete(id); }} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
                    <button onClick={() => toast.dismiss()} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                </div>
            </div>, { autoClose: false, closeButton: false, position: 'top-center' }
        );
    };

    const performDelete = async (id) => {
        try {
            const response = await fetch(API_ENDPOINTS.DELETE_SUBJECT(id), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            await fetchData();
            toast.success('Subject deleted successfully!');
        } catch (err) {
            console.error('Error deleting subject:', err);
            toast.error(`Failed to delete subject: ${err.message}`);
        }
    };

    const handleEdit = (subject) => {
        setNewSubject({
            id: subject.ID,
            Name: subject.Name,
            Code: subject.Code,
            CourseID: subject.CourseID
        });
        setIsEditing(true);
        setShowAddDialog(true);
    };

    const handleAddNewSubject = () => {
        resetForm();
        setShowAddDialog(true);
    };

    const handleCancel = () => {
        resetForm();
        setShowAddDialog(false);
    };

    const resetForm = () => {
        setNewSubject({ id: "", Name: "", Code: "", CourseID: "" });
        setIsEditing(false);
    };

    const getCourseDisplay = (courseId) => {
        const course = courses.find(c => c.ID === courseId);
        return course ? `${course.Code} - ${course.Name}` : <span className="italic text-slate-400">Not Assigned</span>;
    };

    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="flex items-center space-x-3"><FaSpinner className="animate-spin text-blue-500 text-2xl" /><span className="text-slate-600 text-lg">Loading subjects...</span></div></div></div>);
    }

    if (error) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-red-500 text-lg mb-4">{error}</div><button onClick={fetchData} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Retry</button></div></div></div>);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <style dangerouslySetInnerHTML={{ __html: toastCustomStyles }} />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover />
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Heading text="Manage Subjects" />
                        <p className="text-slate-600 mt-2 text-sm sm:text-base">{userRole === 2 || userRole === 3 ? "Add, edit, and manage course subjects" : "View course subjects"}</p>
                    </div>
                </div>
            </div>
            <div className="px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><FaBook className="text-white text-lg" /></div>
                            <div><h2 className="text-lg font-semibold text-slate-800">Course Subjects</h2><p className="text-sm text-slate-600">{filteredSubjects.length} of {subjects.length} subjects</p></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-gray-400" /></div><input type="text" placeholder="Search subjects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                            {(userRole === 2 || userRole === 3) && (
                                <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2" onClick={handleAddNewSubject}><FaPlus className="text-sm" /><span>Add Subject</span></button>
                            )}
                        </div>
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-slate-800 text-white"><th className="px-6 py-4 text-left font-semibold">Subject Code</th><th className="px-6 py-4 text-left font-semibold">Subject Name</th><th className="px-6 py-4 text-left font-semibold">Course</th>{(userRole === 2 || userRole === 3) && <th className="px-6 py-4 text-center font-semibold">Actions</th>}</tr></thead>
                            <tbody>
                                {filteredSubjects.map((subject) => (
                                    <tr key={`desktop-${subject.ID}`} className="hover:bg-blue-50">
                                        <td className="px-6 py-4"><span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-mono font-medium">{subject.Code}</span></td>
                                        <td className="px-6 py-4"><div className="font-medium text-slate-800">{subject.Name}</div></td>
                                        <td className="px-6 py-4"><div className="text-slate-600">{getCourseDisplay(subject.CourseID)}</div></td>
                                        {(userRole === 2 || userRole === 3) && (
                                            <td className="px-6 py-4"><div className="flex justify-center space-x-2"><button className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg" onClick={() => handleEdit(subject)} title="Edit Subject"><FaEdit className="text-sm" /></button><button className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg" onClick={() => handleDelete(subject.ID)} title="Delete Subject"><FaTrash className="text-sm" /></button></div></td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden divide-y divide-slate-200">
                        {filteredSubjects.map((subject) => (
                            <div key={`mobile-${subject.ID}`} className="p-4 hover:bg-slate-50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-mono font-medium">{subject.Code}</span>
                                    {(userRole === 2 || userRole === 3) && (
                                        <div className="flex space-x-2"><button className="bg-emerald-500 text-white p-2 rounded-lg" onClick={() => handleEdit(subject)}><FaEdit className="text-sm" /></button><button className="bg-rose-500 text-white p-2 rounded-lg" onClick={() => handleDelete(subject.ID)}><FaTrash className="text-sm" /></button></div>
                                    )}
                                </div>
                                <div className="font-medium text-slate-800 mb-1">{subject.Name}</div>
                                <div className="text-sm text-slate-600">{getCourseDisplay(subject.CourseID)}</div>
                            </div>
                        ))}
                    </div>
                    {filteredSubjects.length === 0 && !loading && (<div className="text-center py-12"><FaBook className="mx-auto text-slate-400 text-4xl mb-4" /><h3 className="text-lg font-medium text-slate-800 mb-2">{searchTerm ? "No matching subjects found" : "No Subjects Found"}</h3><p className="text-slate-600 mb-4">{searchTerm ? "Try a different search term" : "Get started by adding your first subject."}</p>{!searchTerm && (userRole === 2 || userRole === 3) && (<button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto" onClick={handleAddNewSubject}><FaPlus /><span>Add First Subject</span></button>)}</div>)}
                </div>
            </div>
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b"><h3 className="text-lg font-semibold text-slate-800">{isEditing ? "Edit Subject" : "Add New Subject"}</h3><button onClick={handleCancel} className="text-slate-400 hover:text-slate-600" disabled={isSubmitting}><FaTimes className="text-xl" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label htmlFor="subjectName" className="block text-sm font-medium text-slate-700 mb-2">Subject Name *</label><input id="subjectName" type="text" value={newSubject.Name} onChange={(e) => setNewSubject(prev => ({ ...prev, Name: e.target.value }))} placeholder="Enter subject name" disabled={isSubmitting} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" autoFocus /></div>
                            <div><label htmlFor="subjectCode" className="block text-sm font-medium text-slate-700 mb-2">Subject Code *</label><input id="subjectCode" type="text" value={newSubject.Code} onChange={(e) => setNewSubject(prev => ({ ...prev, Code: e.target.value }))} placeholder="Enter subject code (e.g., CS101)" disabled={isSubmitting} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                            <div>
                                <label htmlFor="course_id" className="block text-sm font-medium text-slate-700 mb-2">Course *</label>
                                <select id="course_id" value={newSubject.CourseID} onChange={(e) => setNewSubject(prev => ({ ...prev, CourseID: e.target.value }))} disabled={isSubmitting || courses.length === 0} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                                    <option value="">Select a course</option>
                                    {courses.map(course => (<option key={course.ID} value={course.ID}>{course.Code} - {course.Name}</option>))}
                                </select>
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button onClick={handleSaveSubject} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                    {isSubmitting ? (<><FaSpinner className="animate-spin" /><span>{isEditing ? "Updating..." : "Saving..."}</span></>) : (<span>{isEditing ? "Update Subject" : "Create Subject"}</span>)}
                                </button>
                                <button onClick={handleCancel} disabled={isSubmitting} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-lg font-medium disabled:cursor-not-allowed">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageSubjects;
