import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { Plus, Hash, LogOut, X, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

export default function ChatLayout({ user, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [channels, setChannels] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const messagesEndRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Fetch channels and users
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Channels (Public + Private)
                const resChannels = await fetch(`${API_URL}/api/channels?userId=${user.id}`);
                if (resChannels.ok) {
                    const data = await resChannels.json();
                    setChannels(data);
                    if (data.length > 0 && !activeChannel) {
                        setActiveChannel(data[0]);
                    }
                }

                // Fetch Users
                const resUsers = await fetch(`${API_URL}/api/users`);
                if (resUsers.ok) {
                    const data = await resUsers.json();
                    setUsers(data);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchData();
    }, [user.id]);

    // Fetch messages when active channel changes
    useEffect(() => {
        if (activeChannel) {
            const fetchMessages = async () => {
                try {
                    const res = await fetch(`${API_URL}/api/channels/${activeChannel.id}/messages`);
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(data);
                    }
                } catch (error) {
                    console.error("Failed to fetch messages", error);
                }
            };
            fetchMessages();
        }
    }, [activeChannel]);

    // Socket listeners
    useEffect(() => {
        socket.connect();

        if (activeChannel) {
            socket.emit('join_channel', activeChannel.id);
        }

        socket.on('receive_message', (message) => {
            setMessages((prev) => {
                // Only add if it belongs to current channel
                if (message.channel_id === activeChannel?.id) {
                    return [...prev, message];
                }
                return prev;
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

    const handleCreateChannel = async (e) => {
        e.preventDefault();
        if (!newChannelName.trim()) return;

        try {
            const res = await fetch(`${API_URL}/api/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newChannelName,
                    type: 'text',
                    description: 'New Text Channel'
                })
            });

            if (res.ok) {
                const newChannel = await res.json();
                setChannels([...channels, newChannel]);
                setActiveChannel(newChannel);
                setIsCreateChannelOpen(false);
                setNewChannelName('');
            }
        } catch (error) {
            console.error("Failed to create channel", error);
        }
    };

    const handleCreateDM = async (targetUser) => {
        if (targetUser.id === user.id) return; // Don't DM yourself

        // Check if DM already exists
        // Note: This is a simple check. In a real app, we'd query the backend more robustly.
        // Here we assume if we have a private channel with this name (or logic), it's the one.
        // For simplicity, we'll just create/find by attempting to create.

        try {
            const res = await fetch(`${API_URL}/api/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: targetUser.username, // DM name is usually the other person's name
                    type: 'private',
                    userIds: [user.id, targetUser.id]
                })
            });

            if (res.ok) {
                const newChannel = await res.json();
                // Check if we already have it in list (backend returns existing ID if we handled that, but here we might get duplicates in list if not careful. 
                // Ideally backend handles "get or create". For now, we just add it.)

                // Simple dedup on frontend
                if (!channels.find(c => c.id === newChannel.id)) {
                    setChannels([...channels, newChannel]);
                }
                setActiveChannel(newChannel);
            }
        } catch (error) {
            console.error("Failed to create DM", error);
        }
    };

    const textChannels = channels.filter(c => c.type === 'text' || !c.type);
    const privateChannels = channels.filter(c => c.type === 'private');

    return (
        <div className="flex h-screen bg-discord-dark text-discord-text overflow-hidden">
            {/* Server Sidebar */}
            <div className="w-[72px] bg-discord-lighter flex flex-col items-center py-3 space-y-2">
                <div className="w-12 h-12 bg-discord-primary rounded-[16px] flex items-center justify-center text-white hover:rounded-[12px] transition-all cursor-pointer">
                    <img src="https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Discord" className="w-8 h-8" />
                </div>
                <div className="w-8 h-[2px] bg-discord-light rounded-full mx-auto" />

                <div
                    onClick={() => setIsCreateChannelOpen(true)}
                    className="w-12 h-12 bg-discord-channel rounded-[24px] hover:rounded-[16px] hover:bg-discord-green transition-all cursor-pointer flex items-center justify-center text-discord-green hover:text-white group"
                    title="Create Channel"
                >
                    <Plus size={24} />
                </div>
            </div>

            {/* Channel Sidebar */}
            <div className="w-60 bg-discord-light flex flex-col">
                <div className="h-12 px-4 flex items-center shadow-sm font-bold text-white hover:bg-discord-hover cursor-pointer transition-colors">
                    Discord Clone
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                    {/* Text Channels */}
                    <div>
                        <div className="px-2 mb-1 flex items-center justify-between text-xs font-bold text-discord-muted uppercase hover:text-discord-text cursor-pointer">
                            <span>Text Channels</span>
                            <Plus size={14} className="cursor-pointer" onClick={() => setIsCreateChannelOpen(true)} />
                        </div>
                        <div className="space-y-0.5">
                            {textChannels.map(channel => (
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
                    </div>

                    {/* Direct Messages */}
                    <div>
                        <div className="px-2 mb-1 text-xs font-bold text-discord-muted uppercase">
                            Direct Messages
                        </div>
                        <div className="space-y-0.5">
                            {privateChannels.map(channel => (
                                <div
                                    key={channel.id}
                                    onClick={() => setActiveChannel(channel)}
                                    className={clsx(
                                        "flex items-center px-2 py-1.5 rounded cursor-pointer group",
                                        activeChannel?.id === channel.id ? "bg-discord-active text-white" : "text-discord-muted hover:bg-discord-hover hover:text-discord-text"
                                    )}
                                >
                                    <div className="w-5 h-5 rounded-full bg-discord-primary mr-2 flex items-center justify-center text-[10px] text-white">
                                        {channel.name.substring(0, 1).toUpperCase()}
                                    </div>
                                    <span className="font-medium truncate">{channel.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* User Bar */}
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
                    {activeChannel?.type === 'private' ? (
                        <MessageSquare size={24} className="text-discord-muted mr-2" />
                    ) : (
                        <Hash size={24} className="text-discord-muted mr-2" />
                    )}
                    <span className="font-bold text-white mr-2">{activeChannel?.name}</span>
                    <span className="text-discord-muted text-sm truncate">{activeChannel?.description}</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, idx) => {
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
                                placeholder={`Message ${activeChannel?.type === 'private' ? '@' : '#'}${activeChannel?.name || 'channel'}`}
                                className="flex-1 bg-transparent border-none text-discord-text placeholder-discord-muted focus:outline-none"
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Member List */}
            <div className="w-60 bg-discord-light hidden lg:flex flex-col p-3">
                <h3 className="text-xs font-bold text-discord-muted uppercase mb-2">Members — {users.length}</h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
                    {users.map(u => (
                        <div
                            key={u.id}
                            onClick={() => handleCreateDM(u)}
                            className={clsx(
                                "flex items-center px-2 py-1.5 hover:bg-discord-hover rounded cursor-pointer opacity-90",
                                u.id === user.id ? "opacity-50 cursor-default" : ""
                            )}
                            title={u.id === user.id ? "That's you!" : "Click to message"}
                        >
                            <div className="w-8 h-8 rounded-full bg-discord-primary mr-3 relative">
                                <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover rounded-full" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-discord-green rounded-full border-[2.5px] border-discord-light"></div>
                            </div>
                            <div className="font-medium text-discord-muted">{u.username} {u.id === user.id && '(You)'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Channel Modal */}
            {isCreateChannelOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-discord-light w-full max-w-md rounded p-6 shadow-lg relative">
                        <button
                            onClick={() => setIsCreateChannelOpen(false)}
                            className="absolute top-4 right-4 text-discord-muted hover:text-discord-text"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-2">Create Text Channel</h2>
                        <p className="text-discord-muted text-sm mb-6">in Discord Clone</p>

                        <form onSubmit={handleCreateChannel}>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Channel Name</label>
                                <div className="flex items-center bg-discord-lighter rounded p-2">
                                    <Hash size={20} className="text-discord-muted mr-2" />
                                    <input
                                        type="text"
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        placeholder="new-channel"
                                        className="bg-transparent border-none text-discord-text focus:outline-none flex-1"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end bg-discord-lighter -mx-6 -mb-6 p-4 rounded-b">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateChannelOpen(false)}
                                    className="px-4 py-2 text-white hover:underline mr-4"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-discord-primary hover:bg-discord-primaryHover text-white rounded font-medium transition-colors"
                                >
                                    Create Channel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
