const Review = require('../model/reviewModel');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

exports.getAllReviews = handlerFactory.getAllDoc(Review);

exports.createReview = catchAsync(async (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.CurrentUser.id;
  const newReview = await Review.create(req.body);
  res.status(200).json({ status: 'success', data: { review: newReview } });
});

exports.deleteReview = handlerFactory.deleteDoc(Review);

exports.updateReview = handlerFactory.updateDoc(Review);
//GET A REVIEW BY REVIEWID WHEREAS IN GETALLREVIEWS WE GET REVIEWS FROM OF A TOUR ID IF SPECIFIED..
exports.getReview = handlerFactory.getOneDoc(Review);
