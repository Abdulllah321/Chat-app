
import axios from 'axios';

const API_URL = 'http://localhost:4040';

const register = (username, password) => {
  return axios.post(`${API_URL}/register`, {
    username,
    password,
  });
};

const login = (username, password) => {
  return axios
    .post(`${API_URL}/login`, {
      username,
      password,
    })
    .then((response) => {
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    });
};

const logout = () => {
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

const authHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    return {};
  }
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  authHeader,
};
