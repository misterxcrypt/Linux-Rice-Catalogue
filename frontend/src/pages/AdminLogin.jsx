import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Login failed");
        return;
      }

      const data = await res.json();
      localStorage.setItem("admin_token", data.token);
      navigate("/admin");
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <form
        onSubmit={handleLogin}
        className="bg-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
      >
        <h2 className="text-2xl font-bold text-white text-center">Admin Login</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <input
          type="password"
          placeholder="Enter Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
