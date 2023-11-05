import { useContext, useEffect, useRef, useState } from "react";
import { HiPaperAirplane } from "react-icons/hi2";
import { BiSolidUser } from "react-icons/bi";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { uniqBy } from "lodash";
import { UserContext } from "./UserContext";
import axios from "axios";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMassageText, setNewMassageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUsername  } = useContext(UserContext);
  const divUnderMessages = useRef(null);

  useEffect(() => {
    connectToWs();
  }, []);
  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);

    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {}, 1000);
    });
  }
  function showOnlinePeople(peopleArray) {
    const people = {};

    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });

    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    // console.log({ ev, messageData });
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      setMessages((prev) => [...prev, { ...messageData }]);
    }
  }

  function sendMassage(ev) {
    ev.preventDefault();
    setNewMassageText("");
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMassageText,
      })
    );
    setMessages((prev) => [
      ...prev,
      {
        text: newMassageText,
        sender: id,
        recipient: selectedUserId,
        id: Date.now(),
      },
    ]);
  }
  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));

      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        // console.log(res.data);
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  function logout() {
    axios.post("/logout").then(()=> {
      setId(null)
      setUsername(null)
      setWs(null)
    })
  }

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messageWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen w-full">
      <div className="bg-white w-1/3 pl-4 pt-4 h-full flex flex-col justify-between">
        <div>
          {" "}
          <Logo />
          {Object.keys(onlinePeopleExclOurUser).map((userId) => (
            <div
              key={userId}
              onClick={() => setSelectedUserId(userId)}
              className={
                "border-b border-gray-100 flex items-center gap-2 cursor-pointer" +
                (userId === selectedUserId ? " bg-blue-200" : "")
              }
            >
              {userId === selectedUserId && (
                <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
              )}
              <div className="flex gap-2 py-2 pl-4">
                <Avatar
                  online={true}
                  username={onlinePeopleExclOurUser[userId]}
                  userId={userId}
                />
                <span className="text-gray-800 ">
                  {onlinePeopleExclOurUser[userId]}
                </span>
              </div>
            </div>
          ))}
          {Object.keys(offlinePeople).map((userId) => (
            <div
              key={userId}
              onClick={() => setSelectedUserId(userId)}
              className={
                "border-b border-gray-100 flex items-center gap-2 cursor-pointer" +
                (userId === selectedUserId ? " bg-blue-200" : "")
              }
            >
              {userId === selectedUserId && (
                <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
              )}
              <div className="flex gap-2 py-2 pl-4">
                <Avatar
                  online={false}
                  username={offlinePeople[userId].username}
                  userId={userId}
                />
                <span className="text-gray-800 ">
                  {offlinePeople[userId].username}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center gap-5">
          <div className="flex items-center ">
            <BiSolidUser className="text-xl mr-2" />
            Logged In as <p className="font-bold capitalize ml-1">{username}</p>
          </div>
          <button
            className="text-sm text-gray-600 bg-blue-200 px-2 py-1 border rounded-sm "
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-blue-200 w-2/3 flex flex-col p-2 justify-between">
        {!selectedUserId && (
          <div className="flex-grow">
            <div className="flex items-center justify-center flex-grow w-full h-full">
              <div className="text-gray-400">
                &larr; Select a Person from the sidebar
              </div>
            </div>
          </div>
        )}
        {!!selectedUserId && (
          <div className="relative h-full">
            <div className="overflow-y-scroll inset-0 absolute top-0 left-0 ring-0 bottom-2">
              {messageWithoutDupes.map((message, index) => (
                <div
                  key={index}
                  className={message.sender === id ? "text-right" : "text-left"}
                >
                  <div
                    className={
                      "p-2 m-2 rounded-md text-sm inline-block text-left max-w-[80%] " +
                      (message.sender === id
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-500")
                    }
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              <div ref={divUnderMessages} />
            </div>
          </div>
        )}

        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMassage}>
            <input
              type="text"
              className="bg-white border p-2 flex-grow rounded-sm"
              placeholder="Type Your Massage Here"
              value={newMassageText}
              onChange={(ev) => setNewMassageText(ev.target.value)}
            />
            <button className="bg-blue-500 p-2 text-white rounded-sm">
              <HiPaperAirplane />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
