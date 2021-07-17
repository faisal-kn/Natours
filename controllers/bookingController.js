const stripe = require('stripe')(
  'sk_test_51JDvf6SAPK2Nlfh2xY4JXopH85mMe8248b59iLG2OGFSxaD6jzPwUX1RUxpKakoT2OFrbc59NdpETDQc4CZqdKuq00XqG3sIf1'
);
const catchAsync = require('../utils/catchAsync');
const Booking = require('../model/bookingModel');
const Tour = require('../model/tourModel');
const handlerFactory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  // console.log(req.params.tourId);
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.CurrentUser.id}&price=${tour.price}`,

    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,

    customer_email: req.CurrentUser.email,

    client_reference_id: req.params.tourId,

    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  res.status(200).json({ status: 'success', session });
});

exports.createBookingsCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;
  if (!tour || !user || !price) return next();
  await Booking.create({ tour, user, price });
  res.redirect(req.originalUrl.split('?')[0]);
  next();
});

exports.getBookings = handlerFactory.getOneDoc(Booking);
exports.getAllBookings = handlerFactory.getAllDoc(Booking);
exports.deleteBookings = handlerFactory.deleteDoc(Booking);
exports.createBookings = handlerFactory.createDoc(Booking);
