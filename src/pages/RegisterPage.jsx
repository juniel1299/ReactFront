import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
    const [form, setForm] = useState({
        userId: '',
        password: '',
        username: '',
    });

    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async () => {
        try {
            const res = await axios.post('/auth/register', form);
            setMessage('회원가입 신청이 완료되었습니다. 관리자의 승인을 기다려주세요.');
            setForm({ userId: '', password: '', username: '' });

            // 2초 후 로그인 페이지로 이동
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setMessage('회원가입 실패: ' + (err.response?.data || '서버 오류'));
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded shadow mt-10">
            <h2 className="text-2xl font-bold mb-4">회원가입</h2>

            <input
                type="text"
                name="userId"
                placeholder="아이디"
                className="w-full border p-2 mb-2"
                value={form.userId}
                onChange={handleChange}
            />
            <input
                type="password"
                name="password"
                placeholder="비밀번호"
                className="w-full border p-2 mb-2"
                value={form.password}
                onChange={handleChange}
            />
            <input
                type="text"
                name="username"
                placeholder="이름"
                className="w-full border p-2 mb-4"
                value={form.username}
                onChange={handleChange}
            />

            <button
                onClick={handleRegister}
                className="w-full bg-green-500 text-white py-2 rounded"
            >
                회원가입 신청
            </button>

            {message && (
                <p className="mt-4 text-sm text-center text-blue-600">{message}</p>
            )}
        </div>
    );
}