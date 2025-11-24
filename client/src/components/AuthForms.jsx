import React, { useState } from 'react';

export default function AuthForms({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        console.log("Attempting login with API_URL:", API_URL); // Debug log

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const body = isLogin ? { email, password } : { email, password, username };

        try {
            console.log("Fetching:", `${API_URL}${endpoint}`);
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            console.log("Response status:", response.status);
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                const text = await response.text();
                console.error("Received non-JSON response:", text.substring(0, 100));
                throw new Error("Server returned HTML instead of JSON. Check API_URL.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            // Successful auth
            onLogin(data.user, data.token);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[url('https://discord.com/assets/f9e79490333d19e6.svg')] bg-cover bg-no-repeat">
            <div className="w-full max-w-md p-8 bg-discord-light rounded-md shadow-lg">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {isLogin ? 'Welcome Back!' : 'Create an Account'}
                    </h2>
                    <p className="text-discord-muted text-sm mt-1">
                        {isLogin ? "We're so excited to see you again!" : "Join the community!"}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-2 bg-discord-red/10 border border-discord-red text-discord-red text-sm rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-bold text-discord-muted uppercase mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-2.5 bg-discord-lighter border-none rounded text-discord-text focus:outline-none focus:ring-2 focus:ring-discord-primary"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-discord-muted uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2.5 bg-discord-lighter border-none rounded text-discord-text focus:outline-none focus:ring-2 focus:ring-discord-primary"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-discord-muted uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2.5 bg-discord-lighter border-none rounded text-discord-text focus:outline-none focus:ring-2 focus:ring-discord-primary"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-discord-primary hover:bg-discord-primaryHover text-white font-medium rounded transition-colors"
                    >
                        {isLogin ? 'Log In' : 'Continue'}
                    </button>
                </form>

                <div className="mt-4 text-sm text-discord-muted">
                    {isLogin ? (
                        <>
                            Need an account?{' '}
                            <button onClick={() => setIsLogin(false)} className="text-discord-primary hover:underline">
                                Register
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button onClick={() => setIsLogin(true)} className="text-discord-primary hover:underline">
                                Log In
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
