import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">대시보드</h1>
                <div className="space-x-2">
                    <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-500 text-white rounded">로그인</button>
                    <button onClick={handleLogout} className="px-4 py-2 bg-gray-500 text-white rounded">로그아웃</button>
                    <button onClick={() => navigate('/register')} className="px-4 py-2 bg-green-500 text-white rounded">회원가입</button>
                </div>
            </div>

            <div className="mb-4 p-4 border rounded shadow bg-gray-50">
                <p className="text-lg font-semibold">👋 {username || 'Guest'}님 환영합니다!</p>
                <p className="text-sm text-gray-600">아이디: {userId || '미로그인'} / 역할: {role || '미로그인'}</p>
            </div>
        </div>
    );
}