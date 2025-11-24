import { io } from 'socket.io-client';

// Connect to the backend server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const socket = io(API_URL, {
    autoConnect: false
});
