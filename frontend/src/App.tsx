import { Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
