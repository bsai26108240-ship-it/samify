import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import {
  Users,
  Music,
  Send,
  X,
  MessageCircle,
  Radio,
  Sparkles,
  Play,
  ChevronUp,
  ChevronDown,
  UserPlus,
  UserCheck,
  UserMinus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../contexts/AuthContext';
import { PlayerContext } from '../contexts/PlayerContext';

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

/**
 * Suggested users for the feed. The feed itself only ever shows people the
 * current user explicitly follows (see `following` below).
 */
const SUGGESTED_CONTACTS = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Alex',
    track: 'Blinding Lights',
    artist: 'The Weeknd',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    fallbackAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    isPlaying: true,
    status: 'online',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'Jordan',
    track: "God's Plan",
    artist: 'Drake',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    fallbackAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isPlaying: true,
    status: 'online',
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    name: 'Taylor',
    track: 'Passionfruit',
    artist: 'Drake',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    fallbackAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isPlaying: false,
    status: 'offline',
  },
];

const FOLLOWING_KEY = (userKey) => `samify_following_${userKey}`;
const PRIVACY_KEY = 'samify_privacy_broadcast';

export const FriendActivity = ({ className = '', isCollapsed = false }) => {
  const { user } = useContext(AuthContext) || {};
  const { playTrack, queue, currentTrack } = useContext(PlayerContext) || {};
  const userKey = user?.id || 'guest';
  const userId = toValidUuid(user?.id);

  const [contacts, setContacts] = useState(SUGGESTED_CONTACTS);
  const [following, setFollowing] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FOLLOWING_KEY(userKey)) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [privacyBroadcast, setPrivacyBroadcast] = useState(() => {
    try {
      return localStorage.getItem(PRIVACY_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [collapsed, setCollapsed] = useState(isCollapsed);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    setCollapsed(isCollapsed);
  }, [isCollapsed]);

  // Re-derive the follow list when the signed-in user changes.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FOLLOWING_KEY(userKey)) || '[]');
      const list = Array.isArray(saved) ? saved : [];
      followingRef.current = list;
      setFollowing(list);
    } catch {
      followingRef.current = [];
      setFollowing([]);
    }
  }, [userKey]);

  const persistFollowing = (ids) => {
    try {
      localStorage.setItem(FOLLOWING_KEY(userKey), JSON.stringify(ids));
    } catch {}
  };

  // Mirror for synchronous reads so batched/burst clicks never race on stale state.
  const followingRef = useRef(following);
  followingRef.current = following;

  const toggleFollow = async (contact) => {
    const prev = followingRef.current;
    const isFollowed = prev.includes(contact.id);
    const next = isFollowed ? prev.filter((id) => id !== contact.id) : [...prev, contact.id];

    followingRef.current = next;
    setFollowing(next);
    persistFollowing(next);

    // Best-effort cloud sync of the follows graph.
    if (userId && supabase) {
      try {
        if (isFollowed) {
          await supabase
            .from('user_follows')
            .delete()
            .match({ follower_id: userId, following_id: contact.id });
        } else {
          await supabase
            .from('user_follows')
            .upsert({ follower_id: userId, following_id: contact.id });
        }
      } catch (err) {
        console.warn('Follow sync skipped:', err?.message || err);
      }
    }
  };

  const togglePrivacy = () => {
    setPrivacyBroadcast((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PRIVACY_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // 1. Fetch Followed Friends & Profiles from Supabase
  useEffect(() => {
    let isMounted = true;

    const fetchFriendsData = async () => {
      if (!userId || !supabase) {
        setContacts(SUGGESTED_CONTACTS);
        return;
      }

      try {
        const { data: follows, error: followsErr } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId);

        if (!followsErr && follows && follows.length > 0) {
          const followingIds = follows.map((f) => f.following_id);
          const { data: profiles, error: profErr } = await supabase
            .from('user_profiles')
            .select('*')
            .in('id', followingIds);

          if (!profErr && profiles && profiles.length > 0 && isMounted) {
            const mapped = profiles.map((p) => ({
              id: p.id,
              name: p.username || 'Friend',
              avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              track: p.current_track?.title || 'Offline',
              artist: p.current_track?.artist || '',
              coverUrl: p.current_track?.coverUrl,
              audioUrl: p.current_track?.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
              isPlaying: p.current_track?.isPlaying ?? true,
              status: p.status || (p.current_track?.isPlaying ? 'online' : 'offline'),
            }));
            // Keep suggested users alongside real cloud profiles.
            const cloudIds = new Set(mapped.map((m) => m.id));
            setContacts([...mapped, ...SUGGESTED_CONTACTS.filter((c) => !cloudIds.has(c.id))]);
            // Adopt the cloud follows so the privacy rule holds across devices.
            setFollowing((prev) => Array.from(new Set([...prev, ...followingIds])));
            return;
          }
        }

        if (isMounted) setContacts(SUGGESTED_CONTACTS);
      } catch (e) {
        if (isMounted) setContacts(SUGGESTED_CONTACTS);
      }
    };

    fetchFriendsData();

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

            setContacts(prev => prev.map(f => {
              if (f.id === updated.id) {
                return {
                  ...f,
                  name: updated.username || f.name,
                  avatar: updated.avatar_url || f.avatar,
                  track: updated.current_track?.title || 'Listening',
                  artist: updated.current_track?.artist || '',
                  coverUrl: updated.current_track?.coverUrl || f.coverUrl,
                  audioUrl: updated.current_track?.audioUrl || f.audioUrl,
                  isPlaying: updated.current_track?.isPlaying ?? true,
                  status: updated.status || (updated.current_track?.isPlaying ? 'online' : 'offline'),
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

  // Click handler to immediately play friend's track
  const handlePlayFriendTrack = (e, friend) => {
    e.stopPropagation();
    if (!playTrack) return;

    const audio = friend.audioUrl || friend.streamUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';
    const trackObj = {
      id: `friend-${friend.id}-${Date.now()}`,
      title: friend.track || 'Friend Track',
      artist: friend.artist || friend.name,
      album: `${friend.name}'s Queue`,
      coverUrl: friend.coverUrl || friend.avatar,
      coverArt: friend.coverUrl || friend.avatar,
      audioUrl: audio,
      streamUrl: audio,
      fallbackAudioUrl: friend.fallbackAudioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 210,
    };

    playTrack(trackObj, queue ? [trackObj, ...queue] : [trackObj]);
  };

  // 3. Chat Drawer: Fetch messages & subscribe to Realtime updates for active friend
  useEffect(() => {
    if (!activeChatFriend) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const friendId = activeChatFriend.id;

    const loadChatHistory = async () => {
      if (!userId || !supabase) {
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

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeChatFriend]);

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

  // The feed ONLY shows users the current user explicitly follows, and only
  // when their live status is 'online'.
  const followedContacts = useMemo(
    () => contacts.filter((c) => following.includes(c.id)),
    [contacts, following]
  );
  const visibleFriends = useMemo(
    () => followedContacts.filter((c) => c.status === 'online'),
    [followedContacts]
  );
  const suggestedContacts = useMemo(
    () => contacts.filter((c) => !following.includes(c.id)).slice(0, 3),
    [contacts, following]
  );

  // Render slim vertical layout if collapsed
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        {visibleFriends.map((friend) => (
          <div
            key={friend.id}
            onClick={(e) => handlePlayFriendTrack(e, friend)}
            title={`Play "${friend.track}" by ${friend.name}`}
            className="relative cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-emerald-400 group-hover:scale-110 transition duration-300">
              <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center">
              <span className="w-1 h-1 bg-black rounded-full animate-ping" />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mt-1 p-2 rounded-full bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 transition"
          aria-label="Expand friend activity"
          title="Expand friend activity"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-4 text-zinc-400">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">Friend Activity</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Listening privacy toggle: hides your own live track from the feed */}
          <button
            type="button"
            onClick={togglePrivacy}
            title={privacyBroadcast ? 'Your listening is broadcast to friends' : 'Broadcast off — your live track is hidden'}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
              privacyBroadcast
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20'
                : 'text-zinc-400 bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            aria-pressed={privacyBroadcast}
            aria-label={privacyBroadcast ? 'Disable listening broadcast' : 'Enable listening broadcast'}
          >
            {privacyBroadcast ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {privacyBroadcast ? 'Public' : 'Private'}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-full bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 transition"
            aria-label="Collapse friend activity"
            title="Collapse friend activity"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Own live broadcast row (hidden entirely when privacy is OFF) */}
      {privacyBroadcast && currentTrack && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-emerald-400/50">
            <img src={currentTrack.coverUrl || '/default-cover.png'} alt="You" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-emerald-300">You</h4>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 rounded-full font-bold uppercase">
                Broadcasting
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 truncate mt-0.5">
              {currentTrack.title} · {currentTrack.artist}
            </p>
          </div>
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
        </div>
      )}
      {!privacyBroadcast && currentTrack && (
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] text-zinc-500">
          <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Your live track is hidden from the feed while broadcast is off.</span>
        </div>
      )}

      {/* Followed, online users only */}
      <div className="space-y-2.5">
        {visibleFriends.map((friend) => (
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
                className="w-full h-full rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:ring-emerald-500/60 transition duration-300"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#121212] flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
              </div>
            </div>

            {/* Friend Info & Currently Playing Track */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition truncate flex items-center gap-1.5">
                  {friend.name}
                  <span className="text-[9px] text-emerald-300 font-bold uppercase">Online</span>
                </h4>
                {friend.isPlaying && (
                  <div className="flex items-end space-x-0.5 h-3">
                    <div className="w-0.5 bg-emerald-400 h-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-0.5 bg-emerald-400 h-2/3 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-0.5 bg-emerald-400 h-4/5 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>

              {/* Tapping track badge plays the exact song */}
              <button
                type="button"
                onClick={(e) => handlePlayFriendTrack(e, friend)}
                className="text-[11px] text-zinc-300 hover:text-emerald-400 truncate font-medium mt-0.5 flex items-center gap-1 group/btn transition text-left"
                title={`Play "${friend.track}" in audio player`}
              >
                <Music className="w-3 h-3 text-emerald-400 flex-shrink-0 group-hover/btn:scale-110 transition" />
                <span className="truncate">{friend.track}</span>
                <Play className="w-2.5 h-2.5 fill-current opacity-0 group-hover:opacity-100 text-emerald-400 transition flex-shrink-0 ml-1" />
              </button>

              {friend.artist && (
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {friend.artist}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => toggleFollow(friend)}
              className={`p-1.5 rounded-full transition flex-shrink-0 justify-self-end ${
                true
                  ? 'text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 md:opacity-60'
                  : ''
              }`}
              aria-label={`Unfollow ${friend.name}`}
              title={`/Unfollow ${friend.name}`}
            >
              <UserMinus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Empty feed hint when nothing is followed or online */}
      {followedContacts.length === 0 && (
        <div className="text-center py-5 px-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <Users className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-zinc-300 mb-1">Your feed is empty</p>
          <p className="text-[11px] text-zinc-500">
            Follow someone below to see their live listening here.
          </p>
        </div>
      )}
      {followedContacts.length > 0 && visibleFriends.length === 0 && (
        <div className="text-center py-5 px-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <Radio className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-zinc-300 mb-1">No friends online right now</p>
          <p className="text-[11px] text-zinc-500">
            Offline users stay hidden until they come back online.
          </p>
        </div>
      )}

      {/* Suggested users with follow/unfollow buttons */}
      {suggestedContacts.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-1">
            Suggested for you
          </p>
          {suggestedContacts.map((contact) => (
            <div
              key={`suggest-${contact.id}`}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#121212]/60 border border-white/5"
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                <div
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#121212] ${
                    contact.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-white truncate">{contact.name}</h5>
                <p className="text-[10px] text-zinc-500 truncate">
                  {contact.status === 'online' ? 'Listening to ' : 'Last played '}
                  {contact.track}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFollow(contact)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition flex-shrink-0 ${
                  following.includes(contact.id)
                    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30'
                    : 'text-white bg-emerald-500 border-emerald-400 hover:bg-emerald-400'
                }`}
                aria-label={`Toggle follow for ${contact.name}`}
              >
                {following.includes(contact.id) ? (
                  <>
                    <UserCheck className="w-3 h-3" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" /> Follow
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

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
                  <button
                    type="button"
                    onClick={(e) => handlePlayFriendTrack(e, activeChatFriend)}
                    className="text-[11px] text-emerald-400 hover:underline truncate flex items-center gap-1"
                  >
                    <Music className="w-3 h-3" /> {activeChatFriend.track}
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </button>
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
