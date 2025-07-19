import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Heading from "../components/Heading";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaUserTie, FaSpinner, FaSearch } from "react-icons/fa";
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

const ManageFaculty = () => {
    const [faculties, setFaculties] = useState([]);
    const [users, setUsers] = useState([]);
    const [filteredFaculties, setFilteredFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [newFaculty, setNewFaculty] = useState({
        ID: "",
        FirstName: "",
        LastName: "",
        UserID: ""
    });
    const { userRole } = useUserRole();
    const navigate = useNavigate();

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const API_ENDPOINTS = {
        GET_FACULTIES: `${API_BASE_URL}/faculty`,
        GET_USERS: `${API_BASE_URL}/user`,
        ADD_FACULTY: `${API_BASE_URL}/faculty`,
        UPDATE_FACULTY: (id) => `${API_BASE_URL}/faculty/${id}`,
        DELETE_FACULTY: (id) => `${API_BASE_URL}/faculty/${id}`
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch both faculties and users in parallel
            const [facultyResponse, userResponse] = await Promise.all([
                fetch(API_ENDPOINTS.GET_FACULTIES, { credentials: 'include' }),
                fetch(API_ENDPOINTS.GET_USERS, { credentials: 'include' })
            ]);

            if (!facultyResponse.ok) throw new Error(`Failed to fetch faculties: ${facultyResponse.status}`);
            if (!userResponse.ok) throw new Error(`Failed to fetch users: ${userResponse.status}`);

            const facultyData = await facultyResponse.json();
            const userData = await userResponse.json();

            setFaculties(Array.isArray(facultyData) ? facultyData : []);
            setFilteredFaculties(Array.isArray(facultyData) ? facultyData : []);
            setUsers(Array.isArray(userData) ? userData : []);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please ensure the backend is running and reachable.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const results = faculties.filter(faculty => {
            const fullName = `${faculty.FirstName || ''} ${faculty.LastName || ''}`.toLowerCase();
            const email = (faculty.User && faculty.User.Email) ? faculty.User.Email.toLowerCase() : '';
            const search = searchTerm.toLowerCase();
            return fullName.includes(search) || email.includes(search);
        });
        setFilteredFaculties(results);
    }, [searchTerm, faculties]);

    const handleSaveFaculty = async () => {
        if (!newFaculty.FirstName.trim() || !newFaculty.LastName.trim()) {
            toast.error('First Name and Last Name are required.');
            return;
        }
        if (!isEditing && !newFaculty.UserID) {
            toast.error('You must select a user to link to the faculty profile.');
            return;
        }

        setIsSubmitting(true);
        try {
            const endpoint = isEditing
                ? API_ENDPOINTS.UPDATE_FACULTY(newFaculty.ID)
                : API_ENDPOINTS.ADD_FACULTY;
            const method = isEditing ? 'PUT' : 'POST';

            const facultyData = {
                FirstName: newFaculty.FirstName.trim(),
                LastName: newFaculty.LastName.trim(),
                UserID: Number(newFaculty.UserID)
            };

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(facultyData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'add'} faculty`);
            }

            await fetchData();
            handleCancel();
            toast.success(`Faculty ${isEditing ? 'updated' : 'added'} successfully!`);
        } catch (err) {
            console.error(`Error saving faculty:`, err);
            toast.error(`Failed to save faculty: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        toast.info(
            <div>
                <div className="mb-2">Are you sure you want to delete this faculty member?</div>
                <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={() => { toast.dismiss(); performDelete(id); }} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
                    <button onClick={() => toast.dismiss()} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                </div>
            </div>, { autoClose: false, closeButton: false, position: 'top-center' }
        );
    };

    const performDelete = async (id) => {
        try {
            const response = await fetch(API_ENDPOINTS.DELETE_FACULTY(id), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            await fetchData();
            toast.success("Faculty Deleted Successfully");
        } catch (err) {
            console.error('Error deleting faculty:', err);
            toast.error(`Failed to delete faculty: ${err.message}`);
        }
    };

    const handleEdit = (faculty) => {
        setNewFaculty({
            ID: faculty.ID,
            FirstName: faculty.FirstName,
            LastName: faculty.LastName,
            UserID: faculty.UserID
        });
        setIsEditing(true);
        setShowAddDialog(true);
    };

    const handleAddNewFaculty = () => {
        resetForm();
        setShowAddDialog(true);
    };

    const handleCancel = () => {
        resetForm();
        setShowAddDialog(false);
    };

    const resetForm = () => {
        setNewFaculty({ ID: "", FirstName: "", LastName: "", UserID: "" });
        setIsEditing(false);
    };

    // Create a list of users who are not already assigned to a faculty member
    const assignedUserIDs = faculties.map(f => f.UserID);
    const availableUsers = users.filter(u => !assignedUserIDs.includes(u.ID) && (u.RoleID === 1 || u.RoleID === 2));

    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="flex items-center space-x-3"><FaSpinner className="animate-spin text-blue-500 text-2xl" /><span className="text-slate-600 text-lg">Loading faculties...</span></div></div></div>);
    }

    if (error) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-red-500 text-lg mb-4">{error}</div><button onClick={fetchData} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Retry</button></div></div></div>);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <style dangerouslySetInnerHTML={{ __html: toastCustomStyles }} />
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="light" />
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><Heading text="Manage Faculty" /><p className="text-slate-600 mt-2 text-sm sm:text-base">{userRole === 2 || userRole === 3 ? "Add, edit, and manage Faculty members" : "View Faculty members"}</p></div></div></div>
            <div className="px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-3"><div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg"><FaUserTie className="text-white text-lg" /></div><div><h2 className="text-lg font-semibold text-slate-800">Faculty Management</h2><p className="text-sm text-slate-600">{filteredFaculties.length} of {faculties.length} members</p></div></div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-gray-400" /></div><input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                            {(userRole === 2 || userRole === 3) && (
                                <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2" onClick={handleAddNewFaculty}><FaPlus className="text-sm" /><span>Add Faculty</span></button>
                            )}
                        </div>
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-slate-800 text-white"><th className="px-6 py-4 text-left font-semibold">Faculty Details</th>{(userRole === 2 || userRole === 3) && <th className="px-6 py-4 text-center font-semibold">Actions</th>}</tr></thead>
                            <tbody>
                                {filteredFaculties.map((faculty) => (
                                    <tr key={`desktop-${faculty.ID}`} className="hover:bg-blue-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{`${faculty.FirstName} ${faculty.LastName}`}</div>
                                            <div className="text-sm text-slate-500 flex items-center gap-2">{faculty.User ? faculty.User.Email : <span className="italic text-slate-400">Email not available</span>}</div>
                                        </td>
                                        {(userRole === 2 || userRole === 3) && (
                                            <td className="px-6 py-4"><div className="flex justify-center space-x-2"><button className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg" onClick={() => handleEdit(faculty)} title="Edit Faculty"><FaEdit className="text-sm" /></button><button className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg" onClick={() => handleDelete(faculty.ID)} title="Delete Faculty"><FaTrash className="text-sm" /></button></div></td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden divide-y divide-slate-200">
                        {filteredFaculties.map((faculty) => (
                            <div key={`mobile-${faculty.ID}`} className="p-4 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-slate-800">{`${faculty.FirstName} ${faculty.LastName}`}</div>
                                        <div className="text-sm text-slate-500">{faculty.User ? faculty.User.Email : ''}</div>
                                    </div>
                                    {(userRole === 2 || userRole === 3) && (
                                        <div className="flex space-x-2"><button className="bg-emerald-500 text-white p-2 rounded-lg" onClick={() => handleEdit(faculty)}><FaEdit className="text-sm" /></button><button className="bg-rose-500 text-white p-2 rounded-lg" onClick={() => handleDelete(faculty.ID)}><FaTrash className="text-sm" /></button></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredFaculties.length === 0 && !loading && (<div className="text-center py-12"><FaUserTie className="mx-auto text-slate-400 text-4xl mb-4" /><h3 className="text-lg font-medium text-slate-800 mb-2">{searchTerm ? "No matching faculty found" : "No Faculty Members Found"}</h3><p className="text-slate-600 mb-4">{searchTerm ? "Try a different search term" : "Get started by adding your first faculty member."}</p>{!searchTerm && (userRole === 2 || userRole === 3) && (<button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto" onClick={handleAddNewFaculty}><FaPlus /><span>Add First Faculty</span></button>)}</div>)}
                </div>
            </div>
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b"><h3 className="text-lg font-semibold text-slate-800">{isEditing ? "Edit Faculty" : "Add New Faculty"}</h3><button onClick={handleCancel} className="text-slate-400 hover:text-slate-600" disabled={isSubmitting}><FaTimes className="text-xl" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label htmlFor="facultyFirstName" className="block text-sm font-medium text-slate-700 mb-2">First Name *</label><input id="facultyFirstName" type="text" value={newFaculty.FirstName} onChange={(e) => setNewFaculty(prev => ({ ...prev, FirstName: e.target.value }))} placeholder="Enter first name" disabled={isSubmitting} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" autoFocus /></div>
                            <div><label htmlFor="facultyLastName" className="block text-sm font-medium text-slate-700 mb-2">Last Name *</label><input id="facultyLastName" type="text" value={newFaculty.LastName} onChange={(e) => setNewFaculty(prev => ({ ...prev, LastName: e.target.value }))} placeholder="Enter last name" disabled={isSubmitting} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                            <div>
                                <label htmlFor="facultyUser" className="block text-sm font-medium text-slate-700 mb-2">Link to User *</label>
                                <select
                                    id="facultyUser"
                                    value={newFaculty.UserID}
                                    onChange={(e) => setNewFaculty(prev => ({ ...prev, UserID: e.target.value }))}
                                    disabled={isSubmitting || isEditing}
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">Select a User</option>
                                    {isEditing && users.find(u => u.ID === newFaculty.UserID) && (
                                        <option value={newFaculty.UserID}>{users.find(u => u.ID === newFaculty.UserID).Email}</option>
                                    )}
                                    {availableUsers.map(user => (
                                        <option key={user.ID} value={user.ID}>{user.Email} ({user.Role.Name})</option>
                                    ))}
                                </select>
                                {isEditing && <p className="text-xs text-slate-500 mt-1">The linked user cannot be changed after creation.</p>}
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button onClick={handleSaveFaculty} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                    {isSubmitting ? (<><FaSpinner className="animate-spin" /><span>{isEditing ? "Updating..." : "Saving..."}</span></>) : (<span>{isEditing ? "Update Faculty" : "Create Faculty"}</span>)}
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

export default ManageFaculty;
