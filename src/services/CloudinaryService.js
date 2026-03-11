import { API_ENDPOINTS } from '../lib/apiconfig';
import axios from 'axios';
import { getAuthItem } from '@/lib/authStorage';

const CloudinaryService = {
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.post(API_ENDPOINTS.CLOUDINARY.IMAGE_UPLOAD, formData, { headers });
        return response.data;
    },
    uploadTemplateFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.post(API_ENDPOINTS.CLOUDINARY.TEMPLATE_UPLOAD, formData, { headers });
        return response.data;
    },
};

export default CloudinaryService;
