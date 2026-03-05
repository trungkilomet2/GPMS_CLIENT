import axios from 'axios';
import BASE_URL from './apiconfig'; // Import từ file bạn vừa tạo

const axiosClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor xử lý dữ liệu trả về cho gọn
axiosClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        // Xử lý lỗi tập trung (ví dụ: Token hết hạn)
        return Promise.reject(error);
    }
);

export default axiosClient;