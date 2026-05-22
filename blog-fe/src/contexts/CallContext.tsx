import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { chatWebSocket } from '../services/chatWebSocket';
import { useAuth } from './AuthContext';
import { sendMessage } from '../api/chat.api';
import { getProfile, type UserProfile } from '../api/auth.api';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected';
export type CallType = 'audio' | 'video';

export interface PeerUser {
    id: string;
    displayName: string;
    avatarUrl?: string;
    username?: string;
}

interface CallContextType {
    callState: CallState;
    callType: CallType;
    peerUser: PeerUser | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    callDuration: number;
    startCall: (targetUserId: string, type: CallType, peer: PeerUser, conversationId: string) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    cancelCall: () => void;
    hangup: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// Premium synthesized ringtones using Web Audio API (zero file dependencies)
class RingtonePlayer {
    private ctx: AudioContext | null = null;
    private intervalId: any = null;

    init() {
        try {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        } catch (e) {
            console.error('Failed to initialize AudioContext for Ringtone:', e);
        }
    }

    playOutgoing() {
        this.stop();
        try {
            this.init();
            const play = () => {
                if (!this.ctx) return;
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
                const now = this.ctx.currentTime;
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc1.frequency.setValueAtTime(440, now); // Standard ringback
                osc2.frequency.setValueAtTime(480, now);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.ctx.destination);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 1.8);
                osc2.stop(now + 1.8);
            };
            play();
            this.intervalId = setInterval(play, 4000);
        } catch (e) {
            console.error('Failed to play outgoing ringtone:', e);
        }
    }

    playIncoming() {
        this.stop();
        try {
            this.init();
            const play = () => {
                if (!this.ctx) return;
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
                const now = this.ctx.currentTime;

                // Premium synthesized marimba-like arpeggio chime (C5 -> E5 -> G5 -> C6)
                // Offers a gorgeous, clean, and modern incoming ringtone with zero external assets.
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
                    if (!this.ctx) return;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.12);

                    const noteStart = now + idx * 0.12;
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.setValueAtTime(0, noteStart);
                    gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.5);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(noteStart);
                    osc.stop(noteStart + 0.5);
                });
            };
            play();
            this.intervalId = setInterval(play, 3000);
        } catch (e) {
            console.error('Failed to play incoming ringtone:', e);
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        // Do NOT close or nullify the AudioContext so that the user's initial unlock gesture is preserved.
    }
}

const ringtone = new RingtonePlayer();

// Pre-unlock AudioContext on the first genuine user interaction with the page
if (typeof window !== 'undefined') {
    const unlock = () => {
        ringtone.init();
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('keydown', unlock, { passive: true });
}

const iceConfiguration: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile: authProfile } = useAuth();
    const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
    const profile = authProfile || localProfile;

    const [callState, setCallState] = useState<CallState>('idle');
    const [callType, setCallType] = useState<CallType>('audio');
    const [peerUser, setPeerUser] = useState<PeerUser | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const targetUserIdRef = useRef<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const isCallerRef = useRef<boolean>(false);
    const connectedTimeRef = useRef<number | null>(null);

    // Keep active user refs
    const currentUserId = profile?.id || '';

    // Self-healing profile loader inside CallProvider to bypass AuthContext's async loading delay
    useEffect(() => {
        if (!authProfile && localStorage.getItem('access_token')) {
            console.log('📡 [CallContext] Fetching user profile locally for call system...');
            getProfile()
                .then((data) => {
                    console.log('✅ [CallContext] Profile loaded successfully:', data.id);
                    setLocalProfile(data);
                })
                .catch((err) => {
                    console.error('❌ [CallContext ERROR] Failed to fetch profile locally:', err);
                });
        }
    }, [authProfile]);

    // Listen to websocket messages
    useEffect(() => {
        const hasToken = !!localStorage.getItem('access_token');
        if (!hasToken && !currentUserId) return;

        const unsubscribe = chatWebSocket.onMessage(async (message) => {
            const { type, payload } = message;

            // Only log and handle call/webrtc signaling messages
            if (type.startsWith('call_') || type.startsWith('webrtc_')) {
                console.log(`📞 [CallContext] Received signaling packet type='${type}':`, { payload, currentCallState: callState });
            }

            switch (type) {
                case 'call_initiate': {
                    console.log('📞 [CallContext] Processing call_initiate incoming payload:', payload);
                    // If we are already in a call or calling, automatically reject as Busy
                    if (callState !== 'idle') {
                        console.warn(`📞 [CallContext WARNING] Already in active state '${callState}'. Sending busy auto-decline to caller:`, payload.caller_id);
                        chatWebSocket.sendSignalingMessage('call_reject', {
                            target_user_id: payload.caller_id,
                            reason: 'busy',
                        });
                        return;
                    }

                    console.log('📞 [CallContext] Setting up incoming call state machine: ringing');
                    isCallerRef.current = false;
                    // Setup incoming call
                    setCallState('ringing');
                    setCallType(payload.call_type);
                    setPeerUser({
                        id: payload.caller_id,
                        displayName: payload.caller_name || 'Anonymous User',
                        avatarUrl: payload.caller_avatar,
                        username: payload.caller_username,
                    });
                    targetUserIdRef.current = payload.caller_id;
                    conversationIdRef.current = payload.conversation_id;

                    console.log('📞 [CallContext] Synthesizing ringtone. Playing incoming call alert...');
                    ringtone.playIncoming();
                    break;
                }

                case 'call_ringing': {
                    if (payload.status === 'accepted' && callState === 'calling') {
                        ringtone.stop();
                        // Caller initializes peer connection and sets tracks
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({
                                audio: {
                                    echoCancellation: true,
                                    noiseSuppression: true,
                                    autoGainControl: true,
                                    channelCount: 1,
                                },
                                video: callType === 'video'
                            });
                            setLocalStream(stream);
                            localStreamRef.current = stream;

                            const pc = new RTCPeerConnection(iceConfiguration);
                            peerConnectionRef.current = pc;

                            stream.getTracks().forEach((track) => {
                                pc.addTrack(track, stream);
                            });

                            pc.ontrack = (event) => {
                                if (event.streams && event.streams[0]) {
                                    setRemoteStream(event.streams[0]);
                                }
                            };

                            pc.onicecandidate = (event) => {
                                if (event.candidate && targetUserIdRef.current) {
                                    chatWebSocket.sendSignalingMessage('webrtc_ice_candidate', {
                                        target_user_id: targetUserIdRef.current,
                                        candidate: event.candidate,
                                    });
                                }
                            };

                            // Create WebRTC Offer
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            chatWebSocket.sendSignalingMessage('webrtc_offer', {
                                target_user_id: targetUserIdRef.current!,
                                sdp: offer,
                            });

                            connectedTimeRef.current = Date.now();
                            setCallState('connected');
                        } catch (err) {
                            console.error('Failed to initiate local media stream:', err);
                            cleanupCall();
                        }
                    }
                    break;
                }

                case 'call_reject': {
                    if (callState === 'calling' || callState === 'ringing') {
                        alert(payload.reason === 'busy' ? 'User is busy.' : 'Call declined.');
                        cleanupCall();
                    }
                    break;
                }

                case 'call_cancel': {
                    if (callState === 'ringing') {
                        cleanupCall();
                    }
                    break;
                }

                case 'call_hangup': {
                    if (callState === 'connected') {
                        cleanupCall();
                    }
                    break;
                }

                case 'webrtc_offer': {
                    if (callState === 'ringing' || callState === 'connected') {
                        // Callee creates Answer description
                        const pc = peerConnectionRef.current;
                        if (!pc) return;

                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                            
                            // Process any queued ICE candidates after remote description is set
                            if (pendingIceCandidatesRef.current.length > 0) {
                                console.log(`🚀 Processing ${pendingIceCandidatesRef.current.length} queued ICE Candidates for callee.`);
                                for (const candidate of pendingIceCandidatesRef.current) {
                                    try {
                                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                                    } catch (e) {
                                        console.error('Error adding queued ICE Candidate:', e);
                                    }
                                }
                                pendingIceCandidatesRef.current = [];
                            }

                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);

                            chatWebSocket.sendSignalingMessage('webrtc_answer', {
                                target_user_id: targetUserIdRef.current!,
                                sdp: answer,
                            });
                        } catch (err) {
                            console.error('Error during WebRTC offer handling:', err);
                        }
                    }
                    break;
                }

                case 'webrtc_answer': {
                    if (callState === 'connected' || callState === 'calling') {
                        const pc = peerConnectionRef.current;
                        if (pc) {
                            try {
                                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

                                // Process any queued ICE candidates after remote description is set
                                if (pendingIceCandidatesRef.current.length > 0) {
                                    console.log(`🚀 Processing ${pendingIceCandidatesRef.current.length} queued ICE Candidates for caller.`);
                                    for (const candidate of pendingIceCandidatesRef.current) {
                                        try {
                                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                                        } catch (e) {
                                            console.error('Error adding queued ICE Candidate:', e);
                                        }
                                    }
                                    pendingIceCandidatesRef.current = [];
                                }
                            } catch (err) {
                                console.error('Error setting remote description:', err);
                            }
                        }
                    }
                    break;
                }

                case 'webrtc_ice_candidate': {
                    const pc = peerConnectionRef.current;
                    if (payload.candidate) {
                        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                            } catch (err) {
                                console.error('Error adding ICE Candidate:', err);
                            }
                        } else {
                            console.log('⏳ Remote description not set yet. Queuing ICE Candidate.');
                            pendingIceCandidatesRef.current.push(payload.candidate);
                        }
                    }
                    break;
                }
            }
        });

        return unsubscribe;
    }, [currentUserId, callState, callType]);

    // Save call history message to database (English format)
    const saveCallHistory = async (prevState: CallState, duration: number) => {
        if (!isCallerRef.current || !conversationIdRef.current) return;

        let content = '';
        if (prevState === 'connected') {
            const formatDuration = (secs: number) => {
                const m = Math.floor(secs / 60).toString().padStart(2, '0');
                const s = (secs % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            };
            const typeLabel = callType === 'video' ? 'Video call' : 'Voice call';
            content = `${typeLabel} ended • ${formatDuration(duration)}`;
        } else if (prevState === 'calling' || prevState === 'ringing') {
            content = 'Missed call';
        } else {
            return;
        }

        try {
            console.log('📞 [CallContext] Saving call history to database:', content);
            await sendMessage({
                conversation_id: conversationIdRef.current,
                type: 'call',
                content: content,
            });
        } catch (err) {
            console.error('Failed to save call history:', err);
        }
    };

    // Clean up call streams, players and connections
    const cleanupCall = () => {
        ringtone.stop();

        const prevState = callState;
        const duration = connectedTimeRef.current ? Math.round((Date.now() - connectedTimeRef.current) / 1000) : 0;

        if (isCallerRef.current && conversationIdRef.current) {
            saveCallHistory(prevState, duration);
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        pendingIceCandidatesRef.current = [];

        setLocalStream(null);
        setRemoteStream(null);
        setCallState('idle');
        setPeerUser(null);
        setIsMuted(false);
        setIsVideoOff(false);
        setCallDuration(0);
        targetUserIdRef.current = null;
        conversationIdRef.current = null;
        isCallerRef.current = false;
        connectedTimeRef.current = null;
    };

    // Trigger Outgoing Call
    const startCall = async (targetUserId: string, type: CallType, peer: PeerUser, conversationId: string) => {
        if (!chatWebSocket.isConnected()) {
            alert('Cannot make call. Chat socket is disconnected.');
            return;
        }

        isCallerRef.current = true;
        setCallState('calling');
        setCallType(type);
        setPeerUser(peer);
        targetUserIdRef.current = targetUserId;
        conversationIdRef.current = conversationId;

        ringtone.playOutgoing();

        chatWebSocket.sendSignalingMessage('call_initiate', {
            target_user_id: targetUserId,
            caller_id: currentUserId,
            caller_name: profile?.display_name || profile?.username || 'Anonymous User',
            caller_avatar: profile?.avatar_url,
            caller_username: profile?.username,
            conversation_id: conversationId,
            call_type: type,
        });
    };

    // Answer Incoming Call
    const acceptCall = async () => {
        if (callState !== 'ringing' || !targetUserIdRef.current) return;
        ringtone.stop();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                },
                video: callType === 'video'
            });
            setLocalStream(stream);
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection(iceConfiguration);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && targetUserIdRef.current) {
                    chatWebSocket.sendSignalingMessage('webrtc_ice_candidate', {
                        target_user_id: targetUserIdRef.current,
                        candidate: event.candidate,
                    });
                }
            };

            chatWebSocket.sendSignalingMessage('call_ringing', {
                target_user_id: targetUserIdRef.current,
                status: 'accepted',
            });

            connectedTimeRef.current = Date.now();
            setCallState('connected');
        } catch (err) {
            console.error('Failed to access media devices on accept:', err);
            chatWebSocket.sendSignalingMessage('call_reject', {
                target_user_id: targetUserIdRef.current,
                reason: 'permission_denied',
            });
            cleanupCall();
        }
    };

    // Reject/Decline call
    const rejectCall = () => {
        if (targetUserIdRef.current) {
            chatWebSocket.sendSignalingMessage('call_reject', {
                target_user_id: targetUserIdRef.current,
                reason: 'declined',
            });
        }
        cleanupCall();
    };

    // Cancel Outgoing Call before answer
    const cancelCall = () => {
        if (targetUserIdRef.current) {
            chatWebSocket.sendSignalingMessage('call_cancel', {
                target_user_id: targetUserIdRef.current,
            });
        }
        cleanupCall();
    };

    // Stop and hang up active call
    const hangup = () => {
        if (targetUserIdRef.current) {
            chatWebSocket.sendSignalingMessage('call_hangup', {
                target_user_id: targetUserIdRef.current,
            });
        }
        cleanupCall();
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    // Live timer ticking effect
    useEffect(() => {
        let intervalId: any = null;
        if (callState === 'connected') {
            setCallDuration(0);
            intervalId = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [callState]);

    return (
        <CallContext.Provider
            value={{
                callState,
                callType,
                peerUser,
                localStream,
                remoteStream,
                isMuted,
                isVideoOff,
                callDuration,
                startCall,
                acceptCall,
                rejectCall,
                cancelCall,
                hangup,
                toggleMute,
                toggleVideo,
            }}
        >
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (context === undefined) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
