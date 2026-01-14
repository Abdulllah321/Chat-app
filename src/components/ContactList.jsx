import Contact from "./Contact";
import Logo from "./Logo";

export default function ContactList({
  onlinePeople,
  offlinePeople,
  selectedUserId,
  setSelectedUserId,
  username,
  logout,
}) {
  return (
    <div className="bg-white w-1/3 flex flex-col">
      <div className="flex-grow">
        <Logo />
        {Object.keys(onlinePeople).map((userId) => (
          <Contact
            key={userId}
            id={userId}
            online={true}
            username={onlinePeople[userId]}
            onClick={() => {
              setSelectedUserId(userId);
            }}
            selected={userId === selectedUserId}
          />
        ))}
        {Object.keys(offlinePeople).map((userId) => (
          <Contact
            key={userId}
            id={userId}
            online={false}
            username={offlinePeople[userId].username}
            onClick={() => setSelectedUserId(userId)}
            selected={userId === selectedUserId}
          />
        ))}
      </div>
      <div className="p-2 text-center flex items-center justify-center">
        <span className="mr-2 text-sm text-gray-600 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
              clipRule="evenodd"
            />
          </svg>
          {username}
        </span>
        <button
          onClick={logout}
          className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm"
        >
          logout
        </button>
      </div>
    </div>
  );
}
