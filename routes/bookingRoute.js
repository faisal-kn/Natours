const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get(
  '/checkout-session/:tourId',
  authController.protect,
  bookingController.getCheckoutSession
);

//implementing all the crud operation
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'lead-guide'));
router.route('/').get(bookingController.getAllBookings);
router
  .route('/:id')
  .get(bookingController.getBookings)
  .post(bookingController.createBookings)
  .delete(bookingController.deleteBookings);

module.exports = router;
