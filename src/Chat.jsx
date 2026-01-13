import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import ContactList from "./components/ContactList.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import MessageInput from "./components/MessageInput.jsx";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    connectToWs();
  }, [selectedUserId]);

  function connectToWs() {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected. Trying to reconnect.");
        connectToWs();
      }, 1000);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach((person) => {
      if (person && person.userId && person.username) {
        people[person.userId] = person.username;
      }
    });
    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    } else if ("typing" in messageData) {
      if (messageData.sender === selectedUserId) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    } else if ("reaction" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) =>
          prev.map((message) => {
            if (message._id === messageData.messageId) {
              return {
                ...message,
                reactions: [...(message.reactions || []), messageData.reaction],
              };
            }
            return message;
          })
        );
      }
    } else if ("delete" in messageData) {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageData.delete
            ? { ...message, text: "This message was deleted" }
            : message
        )
      );
    } else if ("edit" in messageData) {
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageData.edit.messageId
            ? { ...message, text: messageData.edit.text }
            : message
        )
      );
    }
  }

  function handleSendMessageReaction(messageId, reaction) {
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        reaction: reaction,
        messageId: messageId,
      })
    );
  }

  function sendTyping() {
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        typing: true,
      })
    );
  }

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  function handleDeleteMessage(messageId) {
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        delete: messageId,
      })
    );
  }

  function handleEditMessage(messageId, newText) {
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        edit: {
          messageId: messageId,
          text: newText,
        },
      })
    );
  }

  function sendMessage(ev, type = "text", text = newMessageText) {
    if (ev) ev.preventDefault();
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: text,
        type: type,
      })
    );
    setNewMessageText("");
    setMessages((prev) => [
      ...prev,
      {
        text: text,
        sender: id,
        recipient: selectedUserId,
        type: type,
        _id: Date.now(),
      },
    ]);
  }

  async function sendFile(ev) {
    const image = ev.target.files[0];
    const formData = new FormData();
    formData.append("image", image);
    try {
      const result = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      sendMessage(ev, "file", result.data.filename);
    } catch (error) {
      console.error("Error uploading the file:", error);
    }
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
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  return (
    <div className="flex h-screen">
      <ContactList
        onlinePeople={onlinePeopleExclOurUser}
        offlinePeople={offlinePeople}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        username={username}
        logout={logout}
      />
      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <ChatWindow
          selectedUserId={selectedUserId}
          messages={messages}
          divUnderMessages={divUnderMessages}
          id={id}
          handleDeleteMessage={handleDeleteMessage}
          handleEditMessage={handleEditMessage}
          isTyping={isTyping}
          handleSendMessageReaction={handleSendMessageReaction}
        />
        {!!selectedUserId && (
          <MessageInput
            newMessageText={newMessageText}
            setNewMessageText={setNewMessageText}
            sendMessage={sendMessage}
            sendFile={sendFile}
            sendTyping={sendTyping}
          />
        )}
      </div>
    </div>
  );
}
