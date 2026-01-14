export default function IncomingCall({ caller, onAccept, onDecline }) {
    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg">
                <h2 className="text-lg font-bold mb-4">{caller} is calling...</h2>
                <div className="flex justify-end gap-4">
                    <button onClick={onDecline} className="bg-red-500 text-white px-4 py-2 rounded-lg">Decline</button>
                    <button onClick={onAccept} className="bg-green-500 text-white px-4 py-2 rounded-lg">Accept</button>
                </div>
            </div>
        </div>
    );
}
