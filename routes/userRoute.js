const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userControllers');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgetpassword', authController.forgetPassword);
router.patch('/resetpassword/:resetToken', authController.resetPassword);

router.use(authController.protect);

router.patch('/update/password', authController.updatePassword);
router.patch(
  '/update/me',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteUser', userController.deleteCurrentUser);
router.route('/me').get(userController.getMe);

router.use(authController.restrictTo('admin'));

router.route('/').get(userController.getAllUsers);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

//WHY TWO IS REQUIRED :- BECOZ IF DEFINED ONE IT TAKES IT TAKES THE FORST ARGUMENT AS ID AND THINKS UPDATE IS ID .

//WE WILL FORST CHECK IF USER HAS A VALID TOKEN AND THEN GRANT HIM ACCES TO THE ROUTE . THIS WILL ALSO PUT THE
//USER IN REQ.BODY.

module.exports = router;
