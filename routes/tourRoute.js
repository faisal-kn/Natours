const express = require('express');
const tourController = require('../controllers/tourControllers');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoute');

const router = express.Router();

//this is a bit messy now so we need a way to use this createReview from the reviewRouter...
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getTourWithin);

router.route('/distance/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/top-5-cheaptour')
  .get(tourController.cheapAlias, tourController.getAllTours);

router.route('/tourstats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.newTours
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
