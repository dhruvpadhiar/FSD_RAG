
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import LandingPage from "./components/landing"
import LoginPage from "./components/Login"
import SignupPage from "./components/signup"
import PDFChatApp from "./components/pdf-chat-app"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PDFChatApp />} />
        {/* <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} /> */}
        <Route path="/dashboard" element={<PDFChatApp />} />
      </Routes>
    </Router>
  )
}