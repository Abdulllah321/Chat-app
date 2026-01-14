import { createContext, useContext, useState } from 'react';

const CallContext = createContext();

export function CallProvider({ children }) {
    const [call, setCall] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    const value = {
        call,
        setCall,
        localStream,
        setLocalStream,
        remoteStream,
        setRemoteStream,
    };

    return (
        <CallContext.Provider value={value}>
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    return useContext(CallContext);
}
