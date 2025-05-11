import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import AccountPage from './pages/AccountPage';
import AuthorityUserMappingPage from './pages/AuthorityUserMappingPage';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/accountPage" element={<AccountPage />} />
        <Route path="/admin/AuthorityUserMappingPage" element={<AuthorityUserMappingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
