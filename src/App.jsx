import axios from "axios";
import UserContextProvider from "./UserContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = "https://abd-backend-chat.vercel.app";
  axios.defaults.withCredentials = true;

  return (
    <>
      <UserContextProvider>
        <Routes />
      </UserContextProvider>
    </>
  );
}

export default App;
