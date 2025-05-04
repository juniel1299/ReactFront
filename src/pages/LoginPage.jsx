import { useState } from 'react';
import axios from 'axios';

export default function LoginPage() {
    const [id, setId] = useState('');
    const [pw, setPw] = useState('');

    const handleLogin = async () => {
        try {
            const res = await axios.post('/auth/login', { id, pw });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('username', res.data.username);  // ✅ 이름 저장
            localStorage.setItem('userId', res.data.userId);      // ✅ 아이디 저장
            localStorage.setItem('role', res.data.role);          // ✅ 권한 저장
            window.location.href = '/';
        } catch (err) {
            alert('로그인 실패');
        }
    };

    return (
        <div className="p-6 max-w-sm mx-auto bg-white rounded shadow">
            <h2 className="text-lg font-bold mb-4">로그인</h2>
            <input type="text" placeholder="아이디" className="border p-2 w-full mb-2" value={id} onChange={e => setId(e.target.value)} />
            <input type="password" placeholder="비밀번호" className="border p-2 w-full mb-2" value={pw} onChange={e => setPw(e.target.value)} />
            <button className="bg-blue-500 text-white px-4 py-2 rounded w-full" onClick={handleLogin}>로그인</button>
        </div>
    );
}