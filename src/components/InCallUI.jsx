import { PhoneIcon, VideoCameraIcon, MicrophoneIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/solid';
import { useCall } from '../CallContext';
import { useEffect, useRef, useState } from 'react';

export default function InCallUI({ onHangup }) {
    const { localStream, remoteStream } = useCall();
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const localVideo = useRef();
    const remoteVideo = useRef();

    useEffect(() => {
        if (localStream) {
            localVideo.current.srcObject = localStream;
        }
        if (remoteStream) {
            remoteVideo.current.srcObject = remoteStream;
        }
    }, [localStream, remoteStream]);

    function onToggleMic() {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        });
    }

    function onToggleCamera() {
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsCameraOff(!track.enabled);
        });
    }

    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-90 flex flex-col">
            <div className="flex-grow relative">
                <video ref={remoteVideo} autoPlay playsInline className="w-full h-full"></video>
                <video ref={localVideo} autoPlay playsInline muted className="absolute bottom-4 right-4 w-1/4 h-1/4"></video>
            </div>
            <div className="flex justify-center items-center p-4 bg-gray-800">
                <button onClick={onToggleMic} className={`p-4 rounded-full text-white mr-4 ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`}>
                    <MicrophoneIcon className="h-6 w-6" />
                </button>
                <button onClick={onToggleCamera} className={`p-4 rounded-full text-white mr-4 ${isCameraOff ? 'bg-red-500' : 'bg-gray-700'}`}>
                    <VideoCameraIcon className="h-6 w-6" />
                </button>
                <button onClick={onHangup} className="p-4 rounded-full bg-red-500 text-white">
                    <PhoneIcon className="h-6 w-6" />
                </button>
                <button className="p-4 rounded-full bg-gray-700 text-white ml-4">
                    <ArrowsPointingOutIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
}
