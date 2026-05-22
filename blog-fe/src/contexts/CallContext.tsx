import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { chatWebSocket } from '../services/chatWebSocket';
import { useAuth } from './AuthContext';

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

    playOutgoing() {
        this.stop();
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const play = () => {
                if (!this.ctx) return;
                const osc1 = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc1.frequency.setValueAtTime(440, this.ctx.currentTime); // Standard ringback
                osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

                gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.ctx.destination);

                osc1.start();
                osc2.start();
                osc1.stop(this.ctx.currentTime + 1.8);
                osc2.stop(this.ctx.currentTime + 1.8);
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
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const play = () => {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                // Sleek, modern dual-toned pulse
                osc.type = 'sine';
                osc.frequency.setValueAtTime(493.88, this.ctx.currentTime); // B4
                osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.2); // E5
                osc.frequency.setValueAtTime(493.88, this.ctx.currentTime + 0.3);
                osc.frequency.exponentialRampToValueAtTime(880.00, this.ctx.currentTime + 0.5); // A5

                gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 1.2);
            };
            play();
            this.intervalId = setInterval(play, 2000);
        } catch (e) {
            console.error('Failed to play incoming ringtone:', e);
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.ctx) {
            try {
                this.ctx.close();
            } catch (e) {}
            this.ctx = null;
        }
    }
}

const ringtone = new RingtonePlayer();

const iceConfiguration: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [callState, setCallState] = useState<CallState>('idle');
    const [callType, setCallType] = useState<CallType>('audio');
    const [peerUser, setPeerUser] = useState<PeerUser | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const targetUserIdRef = useRef<string | null>(null);
    const conversationIdRef = useRef<string | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // Keep active user refs
    const currentUserId = profile?.id || '';

    // Listen to websocket messages
    useEffect(() => {
        if (!currentUserId) return;

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
                                audio: true,
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
                            } catch (err) {
                                console.error('Error setting remote description:', err);
                            }
                        }
                    }
                    break;
                }

                case 'webrtc_ice_candidate': {
                    const pc = peerConnectionRef.current;
                    if (pc && payload.candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        } catch (err) {
                            console.error('Error adding ICE Candidate:', err);
                        }
                    }
                    break;
                }
            }
        });

        return unsubscribe;
    }, [currentUserId, callState, callType]);

    // Clean up call streams, players and connections
    const cleanupCall = () => {
        ringtone.stop();
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        setLocalStream(null);
        setRemoteStream(null);
        setCallState('idle');
        setPeerUser(null);
        setIsMuted(false);
        setIsVideoOff(false);
        targetUserIdRef.current = null;
        conversationIdRef.current = null;
    };

    // Trigger Outgoing Call
    const startCall = async (targetUserId: string, type: CallType, peer: PeerUser, conversationId: string) => {
        if (!chatWebSocket.isConnected()) {
            alert('Cannot make call. Chat socket is disconnected.');
            return;
        }

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
                audio: true,
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
