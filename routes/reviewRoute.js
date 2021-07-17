const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

//mergerParams will the tourid we are getting in tourRoute to the current Path..
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(authController.restrictTo('user'), reviewController.createReview);

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(authController.restrictTo('user'), reviewController.updateReview)
  .get(reviewController.getReview);

module.exports = router;
