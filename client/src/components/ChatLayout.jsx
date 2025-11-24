import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { Plus, Hash, LogOut } from 'lucide-react';
import clsx from 'clsx';

export default function ChatLayout({ user, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const messagesEndRef = useRef(null);

    // Fetch channels
    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const res = await fetch(`${API_URL}/api/channels`);
                if (res.ok) {
                    const data = await res.json();
                    setChannels(data);
                    if (data.length > 0) {
                        setActiveChannel(data[0]);
                    }
                } else {
                    // Fallback if API fails (e.g. server not running locally yet)
                    console.warn("Failed to fetch channels, using default");
                    const defaultChannels = [{ id: 1, name: 'general', description: 'General discussion' }];
                    setChannels(defaultChannels);
                    setActiveChannel(defaultChannels[0]);
                }
            } catch (error) {
                console.error("Failed to fetch channels", error);
                const defaultChannels = [{ id: 1, name: 'general', description: 'General discussion' }];
                setChannels(defaultChannels);
                setActiveChannel(defaultChannels[0]);
            }
        };
        fetchChannels();
    }, []);

    // Socket listeners
    useEffect(() => {
        socket.connect();

        if (activeChannel) {
            socket.emit('join_channel', activeChannel.id);
        }

        socket.on('receive_message', (message) => {
            setMessages((prev) => {
                // Only add if it belongs to current channel
                // Note: In a real app we might store all and filter, or only listen to room events
                // Here we rely on the fact that we will filter or reload when switching
                return [...prev, message];
            });
        });

        return () => {
            socket.off('receive_message');
            socket.disconnect();
        };
    }, [activeChannel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannel) return;

        socket.emit('send_message', {
            channelId: activeChannel.id,
            userId: user.id,
            username: user.username,
            avatar_url: user.avatar_url,
            content: newMessage
        });

        setNewMessage('');
    };

    return (
        <div className="flex h-screen bg-discord-dark text-discord-text overflow-hidden">
            {/* Server Sidebar (Simplified as just one server for now) */}
            <div className="w-[72px] bg-discord-lighter flex flex-col items-center py-3 space-y-2">
                <div className="w-12 h-12 bg-discord-primary rounded-[16px] flex items-center justify-center text-white hover:rounded-[12px] transition-all cursor-pointer">
                    <img src="https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" className="w-8 h-8" />
                </div>
                <div className="w-8 h-[2px] bg-discord-light rounded-full mx-auto" />
                <div className="w-12 h-12 bg-discord-channel rounded-[24px] hover:rounded-[16px] hover:bg-discord-green transition-all cursor-pointer flex items-center justify-center text-discord-green hover:text-white group">
                    <Plus size={24} />
                </div>
            </div>

            {/* Channel Sidebar */}
            <div className="w-60 bg-discord-light flex flex-col">
                <div className="h-12 px-4 flex items-center shadow-sm font-bold text-white hover:bg-discord-hover cursor-pointer transition-colors">
                    Discord Clone
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {channels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => setActiveChannel(channel)}
                            className={clsx(
                                "flex items-center px-2 py-1.5 rounded cursor-pointer group",
                                activeChannel?.id === channel.id ? "bg-discord-active text-white" : "text-discord-muted hover:bg-discord-hover hover:text-discord-text"
                            )}
                        >
                            <Hash size={20} className="mr-1.5 text-discord-muted" />
                            <span className="font-medium truncate">{channel.name}</span>
                        </div>
                    ))}
                </div>

                {/* User User Bar */}
                <div className="h-[52px] bg-discord-lighter px-2 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-discord-primary mr-2 overflow-hidden">
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{user.username}</div>
                        <div className="text-xs text-discord-muted truncate">#{user.id.toString().padStart(4, '0')}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button onClick={onLogout} className="p-1.5 hover:bg-discord-hover rounded text-discord-muted hover:text-red-400" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-discord-chat min-w-0">
                {/* Header */}
                <div className="h-12 px-4 flex items-center shadow-sm border-b border-discord-light/50">
                    <Hash size={24} className="text-discord-muted mr-2" />
                    <span className="font-bold text-white mr-2">{activeChannel?.name}</span>
                    <span className="text-discord-muted text-sm truncate">{activeChannel?.description}</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.filter(m => m.channel_id === activeChannel?.id).map((msg, idx) => {
                        const prevMsg = messages[idx - 1];
                        const isSequence = prevMsg && prevMsg.user_id === msg.user_id && (new Date(msg.created_at) - new Date(prevMsg.created_at) < 60000);

                        return (
                            <div key={msg.id || idx} className={clsx("group flex pr-4", isSequence ? "mt-0.5" : "mt-4")}>
                                {!isSequence ? (
                                    <div className="w-10 h-10 rounded-full bg-discord-primary mr-4 mt-0.5 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80">
                                        <img src={msg.avatar_url} alt={msg.username} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-10 mr-4 flex-shrink-0 text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 text-right select-none pt-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    {!isSequence && (
                                        <div className="flex items-center">
                                            <span className="font-medium text-white mr-2 hover:underline cursor-pointer">{msg.username}</span>
                                            <span className="text-xs text-discord-muted">{new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    )}
                                    <div className={clsx("text-discord-text whitespace-pre-wrap break-words", isSequence ? "" : "")}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 pb-6">
                    <div className="bg-discord-channel rounded-lg px-4 py-2.5">
                        <form onSubmit={handleSendMessage} className="flex items-center">
                            <button type="button" className="text-discord-muted hover:text-discord-text mr-3">
                                <Plus size={24} className="bg-discord-text text-discord-channel rounded-full p-0.5" />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={`Message #${activeChannel?.name || 'channel'}`}
                                className="flex-1 bg-transparent border-none text-discord-text placeholder-discord-muted focus:outline-none"
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Member List (Simplified) */}
            <div className="w-60 bg-discord-light hidden lg:flex flex-col p-3">
                <h3 className="text-xs font-bold text-discord-muted uppercase mb-2">Online — 1</h3>
                <div className="flex items-center px-2 py-1.5 hover:bg-discord-hover rounded cursor-pointer opacity-50">
                    <div className="w-8 h-8 rounded-full bg-discord-primary mr-3 relative">
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-discord-green rounded-full border-[2.5px] border-discord-light"></div>
                    </div>
                    <div className="font-medium text-discord-muted">Bot (You)</div>
                </div>
            </div>
        </div>
    );
}
