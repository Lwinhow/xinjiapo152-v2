import axios from "axios";

const API_KEY = 'sk-u9kYqNZMU58clB1EH0Srn1W0wW3i0AtvUgS0sI0hmzrzvwM5';
const API_URL = 'https://api.moonshot.cn/v1';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
    }
});

export default {
    getCompletion(model, messages) {
        return apiClient.post(`/chat/completions`, {
            model: model,
            messages: messages
        });
    }
};