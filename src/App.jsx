import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/LoginPage";
import Register from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Router>

      <Routes>

        <Route path="/" element={<Login />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<Register />} />

      </Routes>

    </Router>
  );
}

export default App;