import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSubmissions from "../components/AdminSubmissions";
import AdminStats from "../components/AdminStats";

export default function Admin() {
  const [view, setView] = useState("submissions");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${view === "submissions" ? "bg-blue-600" : "bg-zinc-700"}`}
          onClick={() => setView("submissions")}
        >
          Submission Requests
        </button>
        <button
          className={`px-4 py-2 rounded ${view === "stats" ? "bg-blue-600" : "bg-zinc-700"}`}
          onClick={() => setView("stats")}
        >
          Stats
        </button>
      </div>

      {view === "submissions" ? <AdminSubmissions /> : <AdminStats />}
    </div>
  );
}
