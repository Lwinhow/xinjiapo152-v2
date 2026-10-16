import axios from "axios";

const API_KEY = 'sk-8612078ad58d44308d3a64abbf73f40e';  // 填入 DeepSeek key：https://platform.deepseek.com/api_keys
const API_URL = 'https://api.deepseek.com/v1';

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
