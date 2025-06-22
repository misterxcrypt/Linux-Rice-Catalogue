import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AdminStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/admin/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>Loading stats...</div>;

  const pieData = {
    labels: Object.keys(stats.environment_distribution),
    datasets: [{
      label: "Environment Usage",
      data: Object.values(stats.environment_distribution),
      backgroundColor: [
        "#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"
      ],
    }],
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">Rice Statistics</h2>
      <p>Total Rices: {stats.total}</p>
      <p>Added Today: {stats.today}</p>
      <p>Added This Month: {stats.month}</p>
      <p>Added This Year: {stats.year}</p>
      <div className="mt-6 max-w-md">
        <Pie data={pieData} />
      </div>
    </div>
  );
}
