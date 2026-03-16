import { API_ENDPOINTS } from '../lib/apiconfig';
import axios from 'axios';
import { getAuthItem } from '@/lib/authStorage';

const MAX_CLOUDINARY_FILE_SIZE = 10 * 1024 * 1024; // 10MB (10485760 bytes)

function assertFileSize(file) {
    if (!file) return;

    if (file.size > MAX_CLOUDINARY_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const maxMb = (MAX_CLOUDINARY_FILE_SIZE / (1024 * 1024)).toFixed(0);
        throw {
            response: {
                data: {
                    title: `File quá lớn (${sizeMb}MB). Tối đa ${maxMb}MB. Vui lòng chọn file nhỏ hơn.`,
                },
            },
        };
    }
}

const CloudinaryService = {
    uploadImage: async (file) => {
        assertFileSize(file);
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.post(API_ENDPOINTS.CLOUDINARY.IMAGE_UPLOAD, formData, { headers });
        return response.data;
    },
    uploadTemplateFile: async (file) => {
        assertFileSize(file);
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.post(API_ENDPOINTS.CLOUDINARY.TEMPLATE_UPLOAD, formData, { headers });
        return response.data;
    },
};

export default CloudinaryService;
