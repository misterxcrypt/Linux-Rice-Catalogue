// frontend/src/components/Navbar.jsx
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <div className="font-bold text-xl">
      <Link to="/">Rice Catalogue</Link>
      </div>
      <div className="space-x-4">
        <Link to="/submit">Submit</Link>
        <Link to="/admin">Admin</Link>
      </div>
    </nav>
  );
}
