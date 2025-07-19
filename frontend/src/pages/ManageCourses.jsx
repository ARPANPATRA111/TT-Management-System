import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Heading from "../components/Heading";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaGraduationCap, FaSpinner, FaSearch } from "react-icons/fa";
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

const ManageCourses = () => {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addingCourse, setAddingCourse] = useState(false);
    const [editingCourse, setEditingCourse] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [newCourse, setNewCourse] = useState({
        id: "",
        name: "",
        code: ""
    });
   const { userRole } = useUserRole();
  //  console.log("User Role:", userRole);
    const navigate = useNavigate();

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const API_ENDPOINTS = {
        // Modified to include subjects and batches
        GET_COURSES: `${API_BASE_URL}/course?include=subjects,batches`,
        // Alternative: GET_COURSES: `${API_BASE_URL}/course/with-details`,
        ADD_COURSE: `${API_BASE_URL}/course`,
        UPDATE_COURSE: (id) => `${API_BASE_URL}/course/${id}`,
        DELETE_COURSE: (id) => `${API_BASE_URL}/course/${id}`
    };

    const fetchCourses = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(API_ENDPOINTS.GET_COURSES, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Include credentials for CORS
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Debug: Log the response to see the actual structure
            // console.log('API Response:', data);

            setCourses(data);
            setFilteredCourses(data);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Alternative: Fetch subjects and batches separately
    const fetchCoursesWithDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            // First, get all courses
            const coursesResponse = await fetch(`${API_BASE_URL}/course`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Include credentials for CORS
            });

            if (!coursesResponse.ok) {
                throw new Error(`HTTP error! status: ${coursesResponse.status}`);
            }

            const coursesData = await coursesResponse.json();

            // Then, for each course, fetch its subjects and batches
            const coursesWithDetails = await Promise.all(
                coursesData.map(async (course) => {
                    try {
                        // Fetch subjects for this course
                        const subjectsResponse = await fetch(`${API_BASE_URL}/course/${course.ID}/subjects`, {
                            credentials: 'include'
                        });
                        const subjects = subjectsResponse.ok ? await subjectsResponse.json() : [];

                        // Fetch batches for this course
                        const batchesResponse = await fetch(`${API_BASE_URL}/course/${course.ID}/batches`, {
                            credentials: 'include'
                        });
                        const batches = batchesResponse.ok ? await batchesResponse.json() : [];

                        return {
                            ...course,
                            Subjects: subjects,
                            Batches: batches
                        };
                    } catch (err) {
                        console.error(`Error fetching details for course ${course.ID}:`, err);
                        return {
                            ...course,
                            Subjects: [],
                            Batches: []
                        };
                    }
                })
            );

            setCourses(coursesWithDetails);
            setFilteredCourses(coursesWithDetails);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Use fetchCourses if your API supports including related data
        // Use fetchCoursesWithDetails if you need to fetch separately
        fetchCourses();
        // Uncomment the line below and comment the line above if using separate fetching
        // fetchCoursesWithDetails();
    }, []);

    useEffect(() => {
        const results = courses.filter(course =>
            course.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.Code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCourses(results);
    }, [searchTerm, courses]);

    const handleSaveCourse = async () => {
        if (!newCourse.name.trim() || !newCourse.code.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            editingCourse ? setEditingCourse(true) : setAddingCourse(true);

            const endpoint = editingCourse
                ? API_ENDPOINTS.UPDATE_COURSE(newCourse.id)
                : API_ENDPOINTS.ADD_COURSE;

            const method = editingCourse ? 'PUT' : 'POST';

            const courseData = {
                name: newCourse.name.trim(),
                code: newCourse.code.trim().toUpperCase()
            };

            if (editingCourse) {
                courseData.id = newCourse.id;
            }

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include credentials for CORS
                body: JSON.stringify(courseData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${editingCourse ? 'update' : 'add'} course`);
            }

            await fetchCourses();
            resetForm();
            setShowAddDialog(false);
            toast.success(`Course ${editingCourse ? 'updated' : 'added'} successfully!`);

        } catch (err) {
            console.error(`Error ${editingCourse ? 'updating' : 'adding'} course:`, err);
            toast.error(`Failed to ${editingCourse ? 'update' : 'add'} course: ${err.message}`);
        } finally {
            setAddingCourse(false);
            setEditingCourse(false);
        }
    };
    const handleDelete = async (id) => {
        toast.info(
            <div>
                <div className="mb-2">Are you sure you want to delete this course?</div>
                <div className="flex justify-end space-x-2 mt-2">
                    <button
                        onClick={() => {
                            toast.dismiss();
                            performDelete(id);
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Delete
                    </button>
                    <button
                        onClick={() => toast.dismiss()}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </div>,
            {
                autoClose: false,
                closeButton: false,
                position: 'top-center',
            }
        );
    };
    const performDelete = async (id) => {

        try {
            const response = await fetch(API_ENDPOINTS.DELETE_COURSE(id), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Include credentials for CORS
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setCourses(courses.filter(course => course.ID !== id));
            setFilteredCourses(filteredCourses.filter(course => course.ID !== id));
            toast.success("Courses Deleted Successfully");

        } catch (err) {
            console.error('Error deleting course:', err);
            toast.error(`Failed to delete course: ${err.message}`);
        }
    };

    const handleEdit = (course) => {
        setNewCourse({
            id: course.ID,
            name: course.Name,
            code: course.Code
        });
        setEditingCourse(true);
        setShowAddDialog(true);
    };

    const handleAddNewCourse = () => {
        resetForm();
        setShowAddDialog(true);
    };

    const handleCancel = () => {
        resetForm();
        setShowAddDialog(false);
    };

    const resetForm = () => {
        setNewCourse({
            id: "",
            name: "",
            code: ""
        });
        setEditingCourse(false);
    };

    // Helper function to safely get count
    const getSubjectCount = (course) => {
        if (!course.Subjects) return 0;
        return Array.isArray(course.Subjects) ? course.Subjects.length : 0;
    };

    const getBatchCount = (course) => {
        if (!course.Batches) return 0;
        return Array.isArray(course.Batches) ? course.Batches.length : 0;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="flex items-center justify-center h-64">
                    <div className="flex items-center space-x-3">
                        <FaSpinner className="animate-spin text-blue-500 text-2xl" />
                        <span className="text-slate-600 text-lg">Loading courses...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="text-red-500 text-lg mb-4">{error}</div>
                        <button
                            onClick={fetchCourses}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
             <style dangerouslySetInnerHTML={{ __html: toastCustomStyles }} />
            <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
            {/* Header Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Heading text={userRole === 3 || userRole === 2 ? "Manage Courses" : "View Courses"} />
      <p className="text-slate-600 mt-2 text-sm sm:text-base">
        {userRole === 3 || userRole === 2 ? "Add, edit, and manage academic courses" : "View academic courses"}
      </p>
                    </div>
                    {/* <button
                        onClick={() => navigate("/dashboard")}
                        className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
                    >
                        Back to Dashboard
                    </button> */}
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Table Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg">
                                <FaGraduationCap className="text-white text-lg" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Academic Courses</h2>
                                <p className="text-sm text-slate-600">{filteredCourses.length} of {courses.length} courses</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                          {(userRole === 3 || userRole === 2) && (
                            <div className="relative w-full sm:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                />
                            </div>
                          )}
                            {(userRole === 3 || userRole === 2) && (
                            <button
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm font-medium"
                                onClick={handleAddNewCourse}
                            >
                                <FaPlus className="text-sm" />
                                <span>Add Course</span>
                            </button>
                             )}
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="px-6 py-4 text-left font-semibold w-1/2">Course Code</th>
                                    <th className="px-6 py-4 text-left font-semibold w-1/4">Course Name</th>
                                     {(userRole === 3 || userRole === 2) && (
                                    <th className="px-6 py-4 text-center font-semibold w-1/4">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.map((course) => (
                                    <tr
                                        key={`desktop-${course.ID}`}
                                        className="hover:bg-blue-50 transition-colors duration-150"
                                    >
                                        <td className="px-6 py-4 w-1/2">
                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-medium">
                                                {course.Code}
                                            </span>
                                        </td>
                                       <td className="px-6 py-4  w-1/4">
                                            <div className="font-medium text-slate-800">{course.Name}</div>
                                        </td>
                                         {(userRole === 3 || userRole === 2) && (
                                        <td className="px-6 py-4 w-1/4">
                                            <div className="flex justify-center space-x-2">
                                              <>
                                                <button
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors duration-200 shadow-sm"
                                                    onClick={() => handleEdit(course)}
                                                    title="Edit Course"
                                                >
                                                    <FaEdit className="text-sm" />
                                                </button>
                                                <button
                                                    className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition-colors duration-200 shadow-sm"
                                                    onClick={() => handleDelete(course.ID)}
                                                    title="Delete Course"
                                                >
                                                    <FaTrash className="text-sm" />
                                                </button>
                                                </>
                                            </div>
                                        </td>
                                         )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-200">
                        {filteredCourses.map((course) => (
                            <div
                                key={`mobile-${course.ID}`}
                                className="p-4 hover:bg-slate-50 transition-colors duration-150"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-medium">
                                        {course.Code}
                                    </span>
                                     {(userRole === 3 || userRole === 2) && (
                                    <div className="flex space-x-2">
                                        <button
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors duration-200"
                                            onClick={() => handleEdit(course)}
                                        >
                                            <FaEdit className="text-sm" />
                                        </button>
                                        <button
                                            className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition-colors duration-200"
                                            onClick={() => handleDelete(course.ID)}
                                        >
                                            <FaTrash className="text-sm" />
                                        </button>
                                    </div>
                                     )}
                                </div>
                                <div className="font-medium text-slate-800 mb-1">{course.Name}</div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredCourses.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <FaGraduationCap className="mx-auto text-slate-400 text-4xl mb-4" />
                            <h3 className="text-lg font-medium text-slate-800 mb-2">
                                {searchTerm ? "No matching courses found" : "No Courses Found"}
                            </h3>
                            <p className="text-slate-600 mb-4">
                                {searchTerm ? "Try a different search term" : "Get started by adding your first course."}
                            </p>
                            {!searchTerm && (
                                <button
                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 mx-auto shadow-sm font-medium"
                                    onClick={handleAddNewCourse}
                                >
                                    <FaPlus />
                                    <span>Add First Course</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Course Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200 rounded-t-xl">
                            <h3 className="text-lg font-semibold text-slate-800">
                                {editingCourse ? "Edit Course" : "Add New Course"}
                            </h3>
                            <button
                                onClick={handleCancel}
                                className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                                disabled={addingCourse}
                            >
                                <FaTimes className="text-xl" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="courseCode" className="block text-sm font-medium text-slate-700 mb-2">
                                    Course Code *
                                </label>
                                <input
                                    id="courseCode"
                                    type="text"
                                    value={newCourse.code}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="Enter course code (e.g., CS, IT)"
                                    disabled={addingCourse}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label htmlFor="courseName" className="block text-sm font-medium text-slate-700 mb-2">
                                    Course Name *
                                </label>
                                <input
                                    id="courseName"
                                    type="text"
                                    value={newCourse.name}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter course name"
                                    disabled={addingCourse}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={handleSaveCourse}
                                    disabled={!newCourse.name.trim() || !newCourse.code.trim() || addingCourse}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                >
                                    {addingCourse ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            <span>{editingCourse ? "Updating..." : "Adding..."}</span>
                                        </>
                                    ) : (
                                        <span>{editingCourse ? "Update Course" : "Add Course"}</span>
                                    )}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={addingCourse}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 py-3 px-4 rounded-lg transition-colors duration-200 font-medium disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageCourses;
