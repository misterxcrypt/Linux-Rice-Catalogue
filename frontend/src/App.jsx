// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Submit from "./pages/Submit";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/rice/:id"   element={<Detail />} />
          <Route path="/submit"     element={<Submit />} />
          <Route path="/admin"      element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
