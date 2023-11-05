import axios from "axios";
import { useContext } from "react";
import { useState } from "react";
import { UserContext } from "./UserContext";

const RegisterAndLoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const [error, setError] = useState("");

  const { setUsername: setLoggedInUserName, setId } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();

    const url = isLoginOrRegister === "register" ? "register" : "login";

    try {
      const { data } = await axios.post(url, { username, password });
      setLoggedInUserName(username);
      setId(data.id);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(
          "Username already exists. Please choose a different username."
        );
      } else {
        console.error(err);
      }
      if (err.response && err.response.status === 401) {
        setError("Incorrect password");
      } else {
        console.error(err);
      }
      if (err.response && err.response.status === 402) {
        setError("Unauthorized: User not found");
      } else {
        console.error(err);
      }
    }
  }

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form
        className="w-64 mx-auto mb-12"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <input
          type="text"
          placeholder="username"
          className="block w-full rounded-sm p-2 mb-2"
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
        />
        <input
          type="password"
          placeholder="password"
          className="block w-full rounded-sm p-2 mb-2"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
        />
        {error && <div className="text-red-500">{error}</div>}
        {/* {error && <div className="text-red-500">{error}</div>} */}

        <button
          type="submit"
          className="bg-blue-500 text-white block w-full rounded-sm p-2 "
        >
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        {isLoginOrRegister === "register" && (
          <div className="text-center">
            Already Member?
            <button
              className="font-bold ml-1"
              onClick={() => {
                setIsLoginOrRegister("login");
              }}
            >
              Sign in
            </button>
          </div>
        )}
        {isLoginOrRegister === "login" && (
          <div className="text-center">
            Don&apos;t have an account?
            <button
              className="font-bold ml-1"
              onClick={() => {
                setIsLoginOrRegister("register");
              }}
            >
              Sign up
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default RegisterAndLoginForm;
