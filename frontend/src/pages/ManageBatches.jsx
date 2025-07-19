import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Heading from "../components/Heading";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaTimes,
  FaCalendar,
  FaSpinner,
  FaSearch,
  FaBook,
} from "react-icons/fa";
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

const ManageBatches = () => {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newBatch, setNewBatch] = useState({
    id: "",
    CourseID: "",
    EntryYear: "",
    Sections: [{ Name: "" }],
  });
  const { userRole } = useUserRole();

  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const API_ENDPOINTS = {
    GET_BATCHES: `${API_BASE_URL}/batch`,
    GET_COURSES: `${API_BASE_URL}/course`,
    ADD_BATCH: `${API_BASE_URL}/batch`,
    UPDATE_BATCH: (id) => `${API_BASE_URL}/batch/${id}`,
    DELETE_BATCH: (id) => `${API_BASE_URL}/batch/${id}`,
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_COURSES, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      toast.error("Could not load courses for the dropdown.");
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const [batchesResponse] = await Promise.all([
        fetch(API_ENDPOINTS.GET_BATCHES, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" }),
        fetchCourses(),
      ]);
      if (!batchesResponse.ok) throw new Error(`HTTP error! status: ${batchesResponse.status}`);
      const batchesData = await batchesResponse.json();
      if (!Array.isArray(batchesData)) {
        setBatches([]);
        setFilteredBatches([]);
        return;
      }
      const formattedBatches = batchesData.map((batch) => ({
        id: batch.ID,
        CourseID: batch.CourseID,
        EntryYear: batch.EntryYear,
        Sections: batch.Sections || [],
      }));
      setBatches(formattedBatches);
      setFilteredBatches(formattedBatches);
    } catch (err) {
      console.error("Error fetching batches:", err);
      setError("Failed to load batches. Please try again.");
      setBatches([]);
      setFilteredBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  useEffect(() => {
    const results = batches.filter((batch) => {
        const course = courses.find(c => c.ID === batch.CourseID);
        const courseName = course ? course.Name : '';
        const courseCode = course ? course.Code : '';
        const sections = (batch.Sections || []).map(s => s.Name).join(' ');
        return (batch.EntryYear.toString().includes(searchTerm)) ||
            (courseName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (courseCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (sections.toLowerCase().includes(searchTerm.toLowerCase()))
    });
    setFilteredBatches(results);
  }, [searchTerm, batches, courses]);

  const handleSectionChange = (index, event) => {
    const values = [...newBatch.Sections];
    values[index].Name = event.target.value;
    setNewBatch({ ...newBatch, Sections: values });
  };

  const handleAddSection = () => { setNewBatch({ ...newBatch, Sections: [...newBatch.Sections, { Name: "" }] }); };

  const handleRemoveSection = (index) => {
    const values = [...newBatch.Sections];
    if (values.length > 1) {
      values.splice(index, 1);
      setNewBatch({ ...newBatch, Sections: values });
    }
  };

  const handleSaveNewBatch = async () => {
    const finalSections = newBatch.Sections
      .map(s => ({ Name: s.Name.trim().toUpperCase() }))
      .filter(section => section.Name !== "");
    if (!newBatch.CourseID || !newBatch.EntryYear.toString().trim() || finalSections.length === 0) {
      toast.error("Please select a course, enter a year, and add at least one valid section.");
      return;
    }
    const entryYearNumber = parseInt(newBatch.EntryYear.toString().trim());
    if (isNaN(entryYearNumber)) {
      toast.error("Please enter a valid year (numbers only)");
      return;
    }
    try {
      setAddingBatch(true);
      const batchData = {
        CourseID: Number(newBatch.CourseID),
        EntryYear: entryYearNumber,
        Sections: finalSections,
      };
      const isUpdate = !!newBatch.id;
      const endpoint = isUpdate ? API_ENDPOINTS.UPDATE_BATCH(newBatch.id) : API_ENDPOINTS.ADD_BATCH;
      const method = isUpdate ? "PUT" : "POST";
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(batchData) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || JSON.stringify(errorData));
      }
      await fetchBatches();
      handleCancelAdd();
      toast.success(`Batch ${newBatch.id ? 'updated' : 'added'} successfully!`);
    } catch (err) {
      console.error("Full error:", err);
      toast.error(`Failed to ${newBatch.id ? "update" : "add"} batch: ${err.message}`);
    } finally {
      setAddingBatch(false);
    }
  };

  const handleDelete = (id) => { toast.info(<div><div className="mb-2">Are you sure you want to delete this batch?</div><div className="flex justify-end space-x-2 mt-2"><button onClick={() => { toast.dismiss(); performDelete(id); }} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button><button onClick={() => toast.dismiss()} className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button></div></div>, { autoClose: false, closeButton: false, position: 'top-right' }); };

  const performDelete = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_BATCH(id), { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include" });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await fetchBatches();
      toast.success('Batch deleted successfully!');
    } catch (err) {
      console.error("Error deleting batch:", err);
      toast.error(`Failed to delete batch: ${err.message}`);
    }
  };

  const handleEdit = (batch) => { setNewBatch({ id: batch.id, CourseID: batch.CourseID, EntryYear: batch.EntryYear, Sections: batch.Sections.length > 0 ? [...batch.Sections] : [{ Name: "" }] }); setShowAddDialog(true); };
  const handleAddNewBatch = () => { setNewBatch({ id: "", CourseID: "", EntryYear: "", Sections: [{ Name: "" }] }); setShowAddDialog(true); };
  const handleCancelAdd = () => { setNewBatch({ id: "", CourseID: "", EntryYear: "", Sections: [{ Name: "" }] }); setShowAddDialog(false); };
  const getCourseDisplay = (courseId) => { const course = courses.find((c) => c.ID === courseId); return course ? `${course.Code} - ${course.Name}` : `Course ID: ${courseId}`; };

  if (loading) { return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="flex items-center space-x-3"><FaSpinner className="animate-spin text-blue-500 text-2xl" /><span className="text-slate-600 text-lg">Loading data...</span></div></div></div>); }
  if (error) { return (<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"><div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-red-500 text-lg mb-4">{error}</div><button onClick={fetchBatches} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Retry</button></div></div></div>); }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <style dangerouslySetInnerHTML={{ __html: toastCustomStyles }} />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><Heading text="Manage Batches" /><p className="text-slate-600 mt-2 text-sm sm:text-base">Add, edit, and manage course batches</p></div></div></div>
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center space-x-3"><div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg"><FaBook className="text-white text-lg" /></div><div><h2 className="text-lg font-semibold text-slate-800">Batch Management</h2><p className="text-sm text-slate-600">{filteredBatches.length} of {batches.length} batches</p></div></div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-gray-400" /></div><input type="text" placeholder="Search batches..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
              <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2" onClick={handleAddNewBatch}><FaPlus className="text-sm" /><span>Add Batch</span></button>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-800 text-white"><th className="px-6 py-4 text-left font-semibold">Course</th><th className="px-6 py-4 text-left font-semibold">Entry Year</th><th className="px-6 py-4 text-left font-semibold">Sections</th><th className="px-6 py-4 text-center font-semibold">Actions</th></tr></thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={`desktop-${batch.id}`} className="hover:bg-blue-50">
                    <td className="px-6 py-4">{getCourseDisplay(batch.CourseID)}</td>
                    <td className="px-6 py-4">{batch.EntryYear}</td>
                    <td className="px-6 py-4">
                      {batch.Sections && batch.Sections.length > 0
                        ? batch.Sections.map(s => s.Name).join(', ')
                        : <span className="text-gray-400 italic">No Sections</span>
                      }
                    </td>
                    <td className="px-6 py-4"><div className="flex justify-center space-x-2"><button className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg" onClick={() => handleEdit(batch)} title="Edit Batch"><FaEdit className="text-sm" /></button><button className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg" onClick={() => handleDelete(batch.id)} title="Delete Batch"><FaTrash className="text-sm" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-200">
            {filteredBatches.map((batch) => (
              <div key={`mobile-${batch.id}`} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between mb-3"><span className="font-semibold text-slate-800">{getCourseDisplay(batch.CourseID)}</span><div className="flex space-x-2"><button className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg" onClick={() => handleEdit(batch)}><FaEdit className="text-sm" /></button><button className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg" onClick={() => handleDelete(batch.id)}><FaTrash className="text-sm" /></button></div></div>
                <div className="text-sm text-slate-600"><strong>Year:</strong> {batch.EntryYear}</div>
                <div className="text-sm text-slate-600"><strong>Sections:</strong> {batch.Sections && batch.Sections.length > 0 ? batch.Sections.map(s => s.Name).join(', ') : <span className="italic">No Sections</span>}</div>
              </div>
            ))}
          </div>
          {filteredBatches.length === 0 && (<div className="text-center py-12"><FaBook className="mx-auto text-slate-400 text-4xl mb-4" /><h3 className="text-lg font-medium text-slate-800 mb-2">{searchTerm ? "No matching batches found" : "No Batches Found"}</h3><p className="text-slate-600 mb-4">{searchTerm ? "Try a different search term" : "Get started by adding your first batch."}</p>{!searchTerm && (<button className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto" onClick={handleAddNewBatch}><FaPlus /><span>Add First Batch</span></button>)}</div>)}
        </div>
      </div>
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b"><h3 className="text-lg font-semibold text-slate-800">{newBatch.id ? "Edit Batch" : "Add New Batch"}</h3><button onClick={handleCancelAdd} className="text-slate-400 hover:text-slate-600" disabled={addingBatch}><FaTimes className="text-xl" /></button></div>
            <div className="p-6 space-y-4">
              <div><label htmlFor="course_id" className="block text-sm font-medium text-slate-700 mb-2">Course *</label><select id="course_id" value={newBatch.CourseID} onChange={(e) => setNewBatch({ ...newBatch, CourseID: e.target.value })} disabled={addingBatch || courses.length === 0} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"><option value="">Select a course</option>{courses.map((course) => (<option key={course.ID} value={course.ID}>{course.Code} - {course.Name}</option>))}</select></div>
              <div><label htmlFor="entryYear" className="block text-sm font-medium text-slate-700 mb-2">Entry Year *</label><input id="entryYear" type="number" value={newBatch.EntryYear} onChange={(e) => setNewBatch({ ...newBatch, EntryYear: e.target.value })} placeholder="e.g., 2024" disabled={addingBatch} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sections *</label>
                {newBatch.Sections.map((section, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input type="text" placeholder={`Section Name ${index + 1}`} value={section.Name} onChange={(e) => handleSectionChange(index, e)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100" disabled={addingBatch} />
                    <button type="button" onClick={() => handleRemoveSection(index)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 disabled:bg-red-300" disabled={addingBatch || newBatch.Sections.length <= 1}><FaTrash /></button>
                  </div>
                ))}
                <button type="button" onClick={handleAddSection} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-2" disabled={addingBatch}><FaPlus /><span>Add Another Section</span></button>
              </div>
              <div className="flex space-x-3 pt-4">
                <button onClick={handleSaveNewBatch} disabled={addingBatch} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 disabled:from-slate-300 text-white py-3 px-4 rounded-lg font-medium disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                  {addingBatch ? (<><FaSpinner className="animate-spin" /><span>{newBatch.id ? "Updating..." : "Adding..."}</span></>) : (<span>{newBatch.id ? "Update Batch" : "Add Batch"}</span>)}
                </button>
                <button onClick={handleCancelAdd} disabled={addingBatch} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-lg font-medium disabled:cursor-not-allowed">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageBatches;
