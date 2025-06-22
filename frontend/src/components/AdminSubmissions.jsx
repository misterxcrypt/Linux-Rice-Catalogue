// frontend/src/pages/AdminSubmissions.jsx
import { useEffect, useState } from "react";

const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/admin/submissions")
      .then((res) => res.json())
      .then((data) => {
        console.log("Submissions fetched from API:", data);
        if (Array.isArray(data)) {
          setSubmissions(data);
        } else {
          console.error("Expected an array, got:", data);
          setError("Invalid response from server.");
        }
      })
      .catch((err) => {
        console.error("❌ Error fetching submissions:", err);
        setError("Failed to load submissions.");
      });
  }, []);

  const handleAction = async (id, approve) => {
    const res = await fetch(`http://localhost:8000/api/admin/${approve ? "approve" : "reject"}/${id}`, {
      method: "POST",
    });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } else {
      console.error("Failed to update submission status");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-white mb-4">Pending Submissions</h2>

      {error && (
        <p className="text-red-500 text-center mb-4">{error}</p>
      )}

      {Array.isArray(submissions) && submissions.length === 0 ? (
        <p className="text-white">No pending submissions.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(submissions) && submissions.map((rice) => (
            <div key={rice.id} className="bg-zinc-800 p-4 rounded-xl shadow">
              <img
                src={rice.screenshots[0]}
                alt="screenshot"
                className="w-full h-40 object-cover rounded"
              />
              <h3 className="text-white font-semibold mt-2">{rice.author}</h3>
              <div className="mt-2 flex space-x-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => handleAction(rice.id, true)}
                >
                  Accept
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => handleAction(rice.id, false)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSubmissions;
