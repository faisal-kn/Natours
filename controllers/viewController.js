const Tour = require('../model/tourModel');
const catchAsync = require('../utils/catchAsync');
const Review = require('../model/reviewModel');
const AppError = require('../utils/appError');
const Booking = require('../model/bookingModel');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'bookings')
    res.locals.alert =
      'Your booking was successful! Please check your email for confirmation';

  next();
};

exports.getOverview = catchAsync(async (req, res) => {
  const tours = await Tour.find();
  res.status(200).render('overview', {
    title: 'All tour',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  let tour = await Tour.find({ slug: req.params.slug }).populate({
    path: 'reviews',
    model: Review,
    fields: 'reviews ratings user',
  });
  tour = tour[0];
  if (!tour) {
    return next(new AppError('No tour with that name', 404));
  }
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    )
    .render('tour', {
      title: `${tour.name} Tour`,
      tour,
    });
});

exports.getLogin = catchAsync(async (req, res, next) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "connect-src 'self' https://cdnjs.cloudflare.com"
    )
    .render('login', { title: 'log into your account' });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.CurrentUser.id });
  const toursIds = bookings.map((booking) => booking.tour);
  const tours = await Tour.find({ _id: { $in: toursIds } });
  res.status(200).render('overview', { title: 'My Tours', tours });
});
