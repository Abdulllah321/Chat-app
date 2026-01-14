import { PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

export default function ChatHeader({ selectedUsername, onStartCall }) {
    return (
        <div className="flex justify-between items-center p-2 border-b">
            <h2 className="text-lg font-bold">{selectedUsername}</h2>
            <div className="flex gap-2">
                <button onClick={() => onStartCall('audio')} className="p-2 rounded-full hover:bg-gray-200">
                    <PhoneIcon className="h-6 w-6" />
                </button>
                <button onClick={() => onStartCall('video')} className="p-2 rounded-full hover:bg-gray-200">
                    <VideoCameraIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
}
