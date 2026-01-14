import axios from "axios";
import UserContextProvider from "./UserContext";
import Routes from "./Routes";
import { CallProvider } from "./CallContext";

function App() {
  axios.defaults.baseURL = "http://localhost:4040";
  axios.defaults.withCredentials = true;

  return (
    <>
      <UserContextProvider>
        <CallProvider>
          <Routes />
        </CallProvider>
      </UserContextProvider>
    </>
  );
}

export default App;
