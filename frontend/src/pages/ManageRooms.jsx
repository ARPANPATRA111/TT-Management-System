import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Heading from "../components/Heading";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaDoorClosed, FaSpinner, FaSearch } from "react-icons/fa";
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

const ManageRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [filteredRooms, setFilteredRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [newRoom, setNewRoom] = useState({
        ID: "",
        Name: ""
    });
    const { userRole } = useUserRole();
    const navigate = useNavigate();

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const API_ENDPOINTS = {
        GET_ROOMS: `${API_BASE_URL}/room`,
        ADD_ROOM: `${API_BASE_URL}/room`,
        UPDATE_ROOM: (id) => `${API_BASE_URL}/room/${id}`,
        DELETE_ROOM: (id) => `${API_BASE_URL}/room/${id}`
    };

    const fetchRooms = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(API_ENDPOINTS.GET_ROOMS, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setRooms(Array.isArray(data) ? data : []);
            setFilteredRooms(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching rooms:', err);
            setError('Failed to load rooms. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        const results = rooms.filter(room =>
            room.Name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredRooms(results);
    }, [searchTerm, rooms]);

    const handleSaveRoom = async () => {
        if (!newRoom.Name.trim()) {
            toast.error('Please enter a room name');
            return;
        }

        setIsSubmitting(true);
        try {
            const endpoint = isEditing
                ? API_ENDPOINTS.UPDATE_ROOM(newRoom.ID)
                : API_ENDPOINTS.ADD_ROOM;
            const method = isEditing ? 'PUT' : 'POST';

            const roomData = {
                Name: newRoom.Name.trim()
            };

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(roomData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'add'} room`);
            }

            await fetchRooms();
            handleCancel();
            toast.success(`Room ${isEditing ? 'updated' : 'added'} successfully!`);
        } catch (err) {
            console.error(`Error saving room:`, err);
            toast.error(`Failed to save room: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        toast.info(
            <div>
                <div className="mb-2">Are you sure you want to delete this room?</div>
                <div className="flex justify-end space-x-2 mt-2">
                    <button onClick={() => { toast.dismiss(); performDelete(id); }} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
                    <button onClick={() => toast.dismiss()} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                </div>
            </div>, { autoClose: false, closeButton: false, position: 'top-center' }
        );
    };

    const performDelete = async (id) => {
        try {
            const response = await fetch(API_ENDPOINTS.DELETE_ROOM(id), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            await fetchRooms();
            toast.success("Room Deleted Successfully");
        } catch (err) {
            console.error('Error deleting room:', err);
            toast.error(`Failed to delete room: ${err.message}`);
        }
    };

    const handleEdit = (room) => {
        setNewRoom({
            ID: room.ID,
            Name: room.Name
        });
        setIsEditing(true);
        setShowAddDialog(true);
    };

    const handleAddNewRoom = () => {
        resetForm();
        setShowAddDialog(true);
    };

    const handleCancel = () => {
        resetForm();
        setShowAddDialog(false);
    };

    const resetForm = () => {
        setNewRoom({ ID: "", Name: "" });
        setIsEditing(false);
    };

    if (loading) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="flex items-center space-x-3"><FaSpinner className="animate-spin text-blue-500 text-2xl" /><span className="text-slate-600 text-lg">Loading rooms...</span></div></div></div>);
    }

    if (error) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-red-500 text-lg mb-4">{error}</div><button onClick={fetchRooms} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Retry</button></div></div></div>);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <style dangerouslySetInnerHTML={{ __html: toastCustomStyles }} />
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="light" />
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><Heading text="Manage Rooms" /><p className="text-slate-600 mt-2 text-sm sm:text-base">{userRole === 2 || userRole === 3 ? "Add, edit, and manage rooms" : "View available rooms"}</p></div></div></div>
            <div className="px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center space-x-3"><div className="bg-gradient-to-r from-green-500 to-cyan-600 p-2 rounded-lg"><FaDoorClosed className="text-white text-lg" /></div><div><h2 className="text-lg font-semibold text-slate-800">Room Management</h2><p className="text-sm text-slate-600">{filteredRooms.length} of {rooms.length} rooms</p></div></div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-gray-400" /></div><input type="text" placeholder="Search rooms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                            {(userRole === 2 || userRole === 3) && (
                                <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2" onClick={handleAddNewRoom}><FaPlus className="text-sm" /><span>Add Room</span></button>
                            )}
                        </div>
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-slate-800 text-white"><th className="px-6 py-4 text-left font-semibold">Room Name</th>{(userRole === 2 || userRole === 3) && <th className="px-6 py-4 text-center font-semibold">Actions</th>}</tr></thead>
                            <tbody>
                                {filteredRooms.map((room) => (
                                    <tr key={`desktop-${room.ID}`} className="hover:bg-blue-50">
                                        <td className="px-6 py-4"><div className="font-medium text-slate-800">{room.Name}</div></td>
                                        {(userRole === 2 || userRole === 3) && (
                                            <td className="px-6 py-4"><div className="flex justify-center space-x-2"><button className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg" onClick={() => handleEdit(room)} title="Edit Room"><FaEdit className="text-sm" /></button><button className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg" onClick={() => handleDelete(room.ID)} title="Delete Room"><FaTrash className="text-sm" /></button></div></td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden divide-y divide-slate-200">
                        {filteredRooms.map((room) => (
                            <div key={`mobile-${room.ID}`} className="p-4 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium text-slate-800">{room.Name}</div>
                                    {(userRole === 2 || userRole === 3) && (
                                        <div className="flex space-x-2"><button className="bg-emerald-500 text-white p-2 rounded-lg" onClick={() => handleEdit(room)}><FaEdit className="text-sm" /></button><button className="bg-rose-500 text-white p-2 rounded-lg" onClick={() => handleDelete(room.ID)}><FaTrash className="text-sm" /></button></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredRooms.length === 0 && !loading && (<div className="text-center py-12"><FaDoorClosed className="mx-auto text-slate-400 text-4xl mb-4" /><h3 className="text-lg font-medium text-slate-800 mb-2">{searchTerm ? "No matching rooms found" : "No Rooms Found"}</h3><p className="text-slate-600 mb-4">{searchTerm ? "Try a different search term" : "Get started by adding your first room."}</p>{!searchTerm && (userRole === 2 || userRole === 3) && (<button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto" onClick={handleAddNewRoom}><FaPlus /><span>Add First Room</span></button>)}</div>)}
                </div>
            </div>
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b"><h3 className="text-lg font-semibold text-slate-800">{isEditing ? "Edit Room" : "Add New Room"}</h3><button onClick={handleCancel} className="text-slate-400 hover:text-slate-600" disabled={isSubmitting}><FaTimes className="text-xl" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label htmlFor="roomName" className="block text-sm font-medium text-slate-700 mb-2">Room Name *</label><input id="roomName" type="text" value={newRoom.Name} onChange={(e) => setNewRoom(prev => ({ ...prev, Name: e.target.value }))} placeholder="Enter room name (e.g., Room 101)" disabled={isSubmitting} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" autoFocus /></div>
                            <div className="flex space-x-3 pt-4">
                                <button onClick={handleSaveRoom} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                    {isSubmitting ? (<><FaSpinner className="animate-spin" /><span>{isEditing ? "Updating..." : "Saving..."}</span></>) : (<span>{isEditing ? "Update Room" : "Create Room"}</span>)}
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

export default ManageRooms;
