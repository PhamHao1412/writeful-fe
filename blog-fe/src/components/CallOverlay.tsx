import React, { useEffect, useRef } from 'react';
import { useCall } from '../contexts/CallContext';
import '../styles/CallOverlay.css';

export const CallOverlay: React.FC = () => {
    const {
        callState,
        callType,
        peerUser,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        callDuration,
        acceptCall,
        rejectCall,
        cancelCall,
        hangup,
        toggleMute,
        toggleVideo,
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Bind local stream to element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callState]);

    // Bind remote stream to elements
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream && callType === 'video') {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(err => {
                console.warn('Auto-play remote video stream failed or was blocked by browser policy:', err);
            });
        }
        if (remoteAudioRef.current && remoteStream && callType === 'audio') {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(err => {
                console.warn('Auto-play remote audio stream failed or was blocked by browser policy:', err);
            });
        }
    }, [remoteStream, callState, callType]);

    if (callState === 'idle') return null;

    const renderOutgoing = () => {
        return (
            <div className="call-overlay__panel">
                <div className="call-overlay__avatar-wrapper">
                    {peerUser?.avatarUrl ? (
                        <img src={peerUser.avatarUrl} alt={peerUser.displayName} className="call-overlay__avatar" />
                    ) : (
                        <div className="call-overlay__avatar-placeholder">
                            {peerUser?.displayName.charAt(0).toUpperCase() || '?'}
                        </div>
                    )}
                    <div className="call-overlay__pulse"></div>
                    <div className="call-overlay__pulse--delayed"></div>
                </div>
                <h3 className="call-overlay__name">{peerUser?.displayName}</h3>
                <p className="call-overlay__status">Calling ({callType === 'video' ? 'Video Call' : 'Voice Call'})...</p>

                <div className="call-overlay__actions">
                    <button className="call-btn call-btn--decline" onClick={cancelCall} title="Cancel Call">
                        ❌
                    </button>
                </div>
            </div>
        );
    };

    const renderIncoming = () => {
        return (
            <div className="call-overlay__panel">
                <div className="call-overlay__avatar-wrapper">
                    {peerUser?.avatarUrl ? (
                        <img src={peerUser.avatarUrl} alt={peerUser.displayName} className="call-overlay__avatar" />
                    ) : (
                        <div className="call-overlay__avatar-placeholder">
                            {peerUser?.displayName.charAt(0).toUpperCase() || '?'}
                        </div>
                    )}
                    <div className="call-overlay__pulse"></div>
                    <div className="call-overlay__pulse--delayed"></div>
                </div>
                <h3 className="call-overlay__name">{peerUser?.displayName}</h3>
                <p className="call-overlay__status">Incoming {callType === 'video' ? 'Video Call' : 'Voice Call'}...</p>

                <div className="call-overlay__actions">
                    <button className="call-btn call-btn--decline" onClick={rejectCall} title="Decline">
                        🔴
                    </button>
                    <button className="call-btn call-btn--accept" onClick={acceptCall} title="Accept">
                        🟢
                    </button>
                </div>
            </div>
        );
    };

    const renderConnected = () => {
        return (
            <div className="call-overlay__connected">
                {callType === 'video' ? (
                    <div className="video-container">
                        {/* Glassmorphic Live Timer for Video Calls */}
                        <div className="video-stream__timer">
                            {formatDuration(callDuration)}
                        </div>

                        {/* Remote full-frame Video Stream */}
                        {remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="video-stream__remote"
                            />
                        ) : (
                            <div className="video-stream__remote--audio-only">
                                {peerUser?.avatarUrl ? (
                                    <img src={peerUser.avatarUrl} alt={peerUser.displayName} className="video-stream__avatar-glow" />
                                ) : (
                                    <div className="call-overlay__avatar-placeholder">
                                        {peerUser?.displayName.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="video-stream__audio-indicator">Connecting video stream...</span>
                            </div>
                        )}

                        {/* Local floating PIP Camera Stream */}
                        <div className="video-stream__local-wrapper">
                            {localStream && !isVideoOff ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="video-stream__local"
                                />
                            ) : (
                                <div className="video-stream__local-avatar">
                                    📷
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Audio Call connection layout */
                    <div className="video-stream__remote--audio-only">
                        <audio ref={remoteAudioRef} autoPlay playsInline />
                        
                        <div className="call-overlay__avatar-wrapper">
                            {peerUser?.avatarUrl ? (
                                <img src={peerUser.avatarUrl} alt={peerUser.displayName} className="video-stream__avatar-glow" />
                            ) : (
                                <div className="call-overlay__avatar-placeholder">
                                    {peerUser?.displayName.charAt(0).toUpperCase() || '?'}
                                </div>
                            )}
                            <div className="call-overlay__pulse"></div>
                            <div className="call-overlay__pulse--delayed"></div>
                        </div>

                        <h3 className="call-overlay__name">{peerUser?.displayName}</h3>
                        <p className="video-stream__audio-indicator" style={{ fontFamily: 'monospace', letterSpacing: '1px', fontSize: '24px' }}>
                            {formatDuration(callDuration)}
                        </p>
                    </div>
                )}

                {/* Bottom active controls bar */}
                <div className="call-toolbar">
                    <button
                        className={`toolbar-btn ${isMuted ? 'toolbar-btn--active' : ''}`}
                        onClick={toggleMute}
                        title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                        {isMuted ? '🔇' : '🎙️'}
                    </button>

                    {callType === 'video' && (
                        <button
                            className={`toolbar-btn ${isVideoOff ? 'toolbar-btn--active' : ''}`}
                            onClick={toggleVideo}
                            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                        >
                            {isVideoOff ? '🚫' : '📹'}
                        </button>
                    )}

                    <button
                        className="toolbar-btn toolbar-btn--hangup"
                        onClick={hangup}
                        title="End Call"
                    >
                        📞
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="call-overlay">
            {callState === 'calling' && renderOutgoing()}
            {callState === 'ringing' && renderIncoming()}
            {callState === 'connected' && renderConnected()}
        </div>
    );
};

