import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080', // 백엔드 주소
});

// 요청 시마다 Authorization 헤더 자동 설정
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;