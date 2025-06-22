import { useEffect, useState } from "react";
import { fetchRices } from "../services/api";
import RiceCard from "../components/RiceCard";

export default function Home() {
  const [rices, setRices] = useState([]); // ✅ empty array by default
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRices()
      .then((data) => {
        console.log("Fetched rice data:", data); // debug
        setRices(data);
      })
      .catch((err) => {
        console.error("❌ Error fetching rices:", err);
        setError("Failed to load rices.");
      });
  }, []);

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">      {rices.length === 0 && (
        <p className="text-white col-span-full text-center">No rices found.</p>
      )}
      {rices.map((rice) => (
        <RiceCard key={rice.id} rice={rice} />
      ))}
    </div>
  );
}
