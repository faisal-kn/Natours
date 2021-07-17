/*eslint-disable*/

import axios from 'axios';
import { showAlert } from './alerts';

export const updateData = async function (data) {
  try {
    const res = await axios({
      method: 'PATCH',
      url: 'http://127.0.0.1:3000/api/v1/users/update/me',
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', 'data updated successfully');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const updatePassword = async function (
  passwordCurrent,
  password,
  confirmPassword
) {
  try {
    const res = await axios({
      method: 'PATCH',
      url: 'http://127.0.0.1:3000/api/v1/users/update/password',
      data: {
        passwordCurrent,
        password,
        confirmPassword,
      },
    });
    if (res.data.status === 'success') {
      showAlert('success', 'password updated successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
