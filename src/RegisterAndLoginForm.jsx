import { useContext, useState } from "react";
import { UserContext } from "./UserContext";
import authService from "./services/authService";

const RegisterAndLoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const [error, setError] = useState("");

  const { setUsername: setLoggedInUserName, setId } = useContext(UserContext);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    try {
      if (isLoginOrRegister === "register") {
        await authService.register(username, password);
        // After successful registration, switch to login view
        setIsLoginOrRegister("login");
        setError(""); // Clear previous errors
      } else {
        const data = await authService.login(username, password);
        setLoggedInUserName(data.username);
        setId(data.id);
      }
    } catch (err) {
      const resMessage =
        (err.response &&
          err.response.data &&
          err.response.data.message) ||
        err.message ||
        err.toString();
      setError(resMessage);
    }
  };

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
