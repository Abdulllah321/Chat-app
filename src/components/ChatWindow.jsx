import { useRef, useEffect, useState } from "react";
import axios from "axios";
import { uniqBy } from "lodash";
import EmojiPicker from "emoji-picker-react";

export default function ChatWindow({
  selectedUserId,
  messages,
  divUnderMessages,
  id,
  handleDeleteMessage,
  handleEditMessage,
  isTyping,
  handleSendMessageReaction,
}) {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedMessageText, setEditedMessageText] = useState("");
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const messagesWithoutDupes = uniqBy(messages, "_id");

  const handleEdit = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditedMessageText(currentText);
  };

  const handleSaveEdit = (messageId) => {
    handleEditMessage(messageId, editedMessageText);
    setEditingMessageId(null);
  };

  return (
    <div className="flex-grow">
      {!selectedUserId && (
        <div className="flex h-full flex-grow items-center justify-center">
          <div className="text-gray-300">
            &larr; Select a person from the sidebar
          </div>
        </div>
      )}
      {!!selectedUserId && (
        <div className="relative h-full">
          <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
            {messagesWithoutDupes.map((message) => (
              <div
                key={message._id}
                className={message.sender === id ? "text-right" : "text-left"}
              >
                <div
                  className={
                    "text-left inline-block p-2 my-2 rounded-md text-sm " +
                    (message.sender === id
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500")
                  }
                >
                  {editingMessageId === message._id ? (
                    <div>
                      <input
                        type="text"
                        value={editedMessageText}
                        onChange={(e) => setEditedMessageText(e.target.value)}
                        className="bg-white text-black p-1 rounded-sm"
                      />
                      <button
                        onClick={() => handleSaveEdit(message._id)}
                        className="bg-green-500 text-white p-1 rounded-sm ml-2"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div>
                      {message.type === "text" && message.text}
                      {message.type === "file" && (
                        <div className="">
                          <a
                            target="_blank"
                            className="flex items-center gap-1 border-b"
                            href={
                              axios.defaults.baseURL +
                              "/uploads/" +
                              message.text
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {message.text}
                          </a>
                        </div>
                      )}
                      {message.sender === id && (
                        <div>
                          <button
                            onClick={() =>
                              handleEdit(message._id, message.text)
                            }
                            className="bg-yellow-500 text-white p-1 rounded-sm ml-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="bg-red-500 text-white p-1 rounded-sm ml-2"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowEmojiPickerFor(message._id)}
                            className="bg-gray-500 text-white p-1 rounded-sm ml-2"
                          >
                            React
                          </button>
                        </div>
                      )}
                      {showEmojiPickerFor === message._id && (
                        <EmojiPicker
                          onEmojiClick={(emoji) => {
                            handleSendMessageReaction(message._id, emoji.emoji);
                            setShowEmojiPickerFor(null);
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div className="flex">
                    {message.reactions?.map((reaction, index) => (
                      <div
                        key={index}
                        className="bg-gray-200 text-gray-800 p-1 rounded-sm"
                      >
                        {reaction}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && <div className="text-gray-500">typing...</div>}
            <div ref={divUnderMessages}></div>
          </div>
        </div>
      )}
    </div>
  );
}
