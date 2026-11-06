import React, { useState, useEffect, useContext, useRef } from 'react';
import { Users, Music, Send, X, MessageCircle, Radio, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../contexts/AuthContext';

// Helper to guarantee valid UUID for postgres
const toValidUuid = (id) => {
  if (!id || id === 'guest') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const DEFAULT_FRIENDS = [
  { 
    id: '11111111-1111-4111-a111-111111111111', 
    name: 'Alex', 
    track: 'Blinding Lights', 
    artist: 'The Weeknd', 
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    isPlaying: true 
  },
  { 
    id: '22222222-2222-4222-a222-222222222222', 
    name: 'Jordan', 
    track: "God's Plan", 
    artist: 'Drake', 
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
    isPlaying: true 
  },
  { 
    id: '33333333-3333-4333-a333-333333333333', 
    name: 'Taylor', 
    track: 'Passionfruit', 
    artist: 'Drake', 
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    isPlaying: false 
  }
];

export const FriendActivity = ({ className = '' }) => {
  const { user } = useContext(AuthContext) || {};
  const userId = toValidUuid(user?.id);

  const [friends, setFriends] = useState(DEFAULT_FRIENDS);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef(null);

  // 1. Fetch Followed Friends & Profiles from Supabase
  useEffect(() => {
    let isMounted = true;

    const fetchFriendsData = async () => {
      if (!userId || !supabase) {
        setFriends(DEFAULT_FRIENDS);
        return;
      }

      try {
        // Query user_follows where follower_id = user.id
        const { data: follows, error: followsErr } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId);

        if (!followsErr && follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          const { data: profiles, error: profErr } = await supabase
            .from('user_profiles')
            .select('*')
            .in('id', followingIds);

          if (!profErr && profiles && profiles.length > 0 && isMounted) {
            const mapped = profiles.map(p => ({
              id: p.id,
              name: p.username || 'Friend',
              avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              track: p.current_track?.title || 'Offline',
              artist: p.current_track?.artist || '',
              coverUrl: p.current_track?.coverUrl,
              isPlaying: p.current_track?.isPlaying ?? true
            }));
            setFriends(mapped);
            return;
          }
        }

        // Fallback to default community demo friends if no follows yet
        if (isMounted) setFriends(DEFAULT_FRIENDS);
      } catch (e) {
        if (isMounted) setFriends(DEFAULT_FRIENDS);
      }
    };

    fetchFriendsData();

    // 2. Supabase Realtime Subscription on user_profiles
    if (supabase) {
      const channel = supabase
        .channel('public:user_profiles')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_profiles' },
          (payload) => {
            if (!isMounted) return;
            const updated = payload.new;
            if (!updated) return;

            setFriends(prev => prev.map(f => {
              if (f.id === updated.id) {
                return {
                  ...f,
                  name: updated.username || f.name,
                  avatar: updated.avatar_url || f.avatar,
                  track: updated.current_track?.title || 'Listening',
                  artist: updated.current_track?.artist || '',
                  coverUrl: updated.current_track?.coverUrl || f.coverUrl,
                  isPlaying: updated.current_track?.isPlaying ?? true
                };
              }
              return f;
            }));
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => { isMounted = false; };
  }, [userId]);

  // 3. Chat Drawer: Fetch messages & subscribe to Realtime updates for active friend
  useEffect(() => {
    if (!activeChatFriend) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const friendId = activeChatFriend.id;

    // Load initial conversation history
    const loadChatHistory = async () => {
      if (!userId || !supabase) {
        // Mock demo messages for offline / preview
        setMessages([
          { id: 'm1', sender_id: friendId, message: `Hey! Loving this track right now: ${activeChatFriend.track}`, created_at: new Date(Date.now() - 60000).toISOString() },
          { id: 'm2', sender_id: userId || 'me', message: "Such a vibe! Let's listen together.", created_at: new Date().toISOString() }
        ]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('friend_messages')
          .select('*')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && data && isMounted) {
          setMessages(data);
        } else if (isMounted) {
          setMessages([
            { id: 'm1', sender_id: friendId, message: `Hey! Listening to ${activeChatFriend.track}`, created_at: new Date().toISOString() }
          ]);
        }
      } catch {
        if (isMounted) {
          setMessages([
            { id: 'm1', sender_id: friendId, message: `Listening to ${activeChatFriend.track}`, created_at: new Date().toISOString() }
          ]);
        }
      }
    };

    loadChatHistory();

    // Realtime subscription on friend_messages
    if (userId && supabase) {
      const chatChannel = supabase
        .channel(`chat_${userId}_${friendId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'friend_messages' },
          (payload) => {
            if (!isMounted) return;
            const newMsg = payload.new;
            if (
              (newMsg.sender_id === userId && newMsg.receiver_id === friendId) ||
              (newMsg.sender_id === friendId && newMsg.receiver_id === userId)
            ) {
              setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(chatChannel);
      };
    }

    return () => { isMounted = false; };
  }, [activeChatFriend, userId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeChatFriend]);

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatFriend) return;

    const text = inputText.trim();
    setInputText('');

    const optimisticId = `msg_${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      sender_id: userId || 'me',
      receiver_id: activeChatFriend.id,
      message: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);

    if (userId && supabase) {
      try {
        const { data, error } = await supabase
          .from('friend_messages')
          .insert({
            sender_id: userId,
            receiver_id: activeChatFriend.id,
            message: text
          })
          .select()
          .single();

        if (data && !error) {
          setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
        }
      } catch (err) {
        console.error("Failed to send message to cloud:", err);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-4 text-zinc-400">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">Friend Activity</h3>
        </div>
        <span className="flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Radio className="w-3 h-3 mr-1 animate-pulse" /> Live
        </span>
      </div>

      <div className="space-y-2.5">
        {friends.map((friend) => (
          <div 
            key={friend.id}
            onClick={() => setActiveChatFriend(friend)}
            className="group flex items-center space-x-3.5 p-3 rounded-2xl bg-[#121212]/80 hover:bg-[#1c1c1c] border border-white/5 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            {/* Friend Avatar with Live status pulse */}
            <div className="relative w-11 h-11 rounded-full flex-shrink-0">
              <img 
                src={friend.avatar} 
                alt={friend.name} 
                className="w-full h-full rounded-full object-cover ring-2 ring-transparent group-hover:ring-emerald-500/50 transition duration-300" 
              />
              {friend.isPlaying ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#121212] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-600 rounded-full border-2 border-[#121212]" />
              )}
            </div>

            {/* Friend Info & Currently Playing Track */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition truncate">
                  {friend.name}
                </h4>
                {friend.isPlaying && (
                  <div className="flex items-end space-x-0.5 h-3">
                    <div className="w-0.5 bg-emerald-400 h-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-0.5 bg-emerald-400 h-2/3 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-0.5 bg-emerald-400 h-4/5 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zinc-300 truncate font-medium mt-0.5 flex items-center gap-1">
                <Music className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span>{friend.track}</span>
              </p>
              {friend.artist && (
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {friend.artist}
                </p>
              )}
            </div>

            {/* Chat Icon on Hover */}
            <div className="opacity-0 group-hover:opacity-100 transition text-zinc-400 hover:text-emerald-400 p-1">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Slide-over Live Friend Chat Drawer */}
      {activeChatFriend && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:w-96 bg-[#121212] border-l border-white/10 h-full flex flex-col shadow-2xl animate-slideLeft">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#181818]">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="relative w-10 h-10 rounded-full flex-shrink-0">
                  <img src={activeChatFriend.avatar} alt={activeChatFriend.name} className="w-full h-full rounded-full object-cover" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    {activeChatFriend.name}
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </h4>
                  <p className="text-[11px] text-emerald-400 truncate flex items-center gap-1">
                    <Music className="w-3 h-3" /> {activeChatFriend.track}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveChatFriend(null)} 
                className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-hide">
              <div className="text-center py-2">
                <span className="text-[10px] text-zinc-500 bg-white/5 px-2.5 py-1 rounded-full">
                  Real-time direct chat with {activeChatFriend.name}
                </span>
              </div>

              {messages.map((m) => {
                const isMe = m.sender_id === (userId || 'me');
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs ${
                        isMe 
                          ? 'bg-emerald-500 text-black font-medium rounded-tr-sm' 
                          : 'bg-[#222] text-white border border-white/5 rounded-tl-sm'
                      }`}
                    >
                      <p className="break-words">{m.message}</p>
                      <span className={`text-[9px] block text-right mt-1 opacity-70 ${isMe ? 'text-black/80' : 'text-zinc-400'}`}>
                        {new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3.5 bg-[#181818] border-t border-white/10 flex items-center space-x-2">
              <input 
                type="text" 
                placeholder={`Message ${activeChatFriend.name}...`} 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#262626] text-white text-xs px-4 py-2.5 rounded-full border border-transparent focus:border-emerald-500 focus:outline-none transition"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black p-2.5 rounded-full transition flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default FriendActivity;

