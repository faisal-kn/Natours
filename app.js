const path = require('path');
const morgan = require('morgan');
const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoSanatize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const helmet = require('helmet');
const csp = require('express-csp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const errorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoute');
const reviewRouter = require('./routes/reviewRoute');
const tourRouter = require('./routes/tourRoute');
const viewRouter = require('./routes/viewRoute');
const bookingRouter = require('./routes/bookingRoute');

//express is a function that upon will add a bunch of method to the app
const app = express();
app.enable('trust proxy');

//setting up a engine template
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//GLOBAL MIDDLEWARE..
app.use(cors());
app.options('*', cors());
//serving static files:-this middleware basically tells that all the static files to be served from public folder.
app.use(express.static(path.join(__dirname, 'public')));

//when we will call helmet it will return 15 smaller middlewares, 11 of which are enabled by default.
app.use(helmet());
csp.extend(app, {
  policy: {
    directives: {
      'default-src': ['self'],
      'style-src': ['self', 'unsafe-inline', 'https:'],
      'font-src': ['self', 'https://fonts.gstatic.com'],
      'script-src': [
        'self',
        'unsafe-inline',
        'data',
        'blob',
        'https://js.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:8828',
        'ws://localhost:56558/',
      ],
      'worker-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
      'frame-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
      'img-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
      'connect-src': [
        'self',
        'unsafe-inline',
        'data:',
        'blob:',
        'wss://<HEROKU-SUBDOMAIN>.herokuapp.com:<PORT>/',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://localhost:*/',
      ],
    },
  },
});
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
//IMPLEMENTING RATE-LIMITING TO PREVENT BRUTE-FORCE ATTACKS AND DENIAL OF SERVICES..limiter is a middleware function
//whose inner functionality will be implemented by the package that we just installed.
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this api .Please try again in 1 hour',
});
app.use('/api', limiter);

//IS USED TO GET REQ.BODY .it is bodyparser it reads the data from body to req.body..
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

//data sanatization against nosql query injection...it will clean $ sign fro the requsetbody and params and everywhere.
app.use(mongoSanatize());
//data sanatization against cross-site-scripting attacks...will clean code from malicious html as it can be inserted to
//our frontend and do some damage.
app.use(xssClean());
//prevent parameter pollution as it will not allow user to write two sort in paramenters.
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //putted by the cookie parser..
  // console.log(req.cookies);
  next();
});

//we specify in the callback function what we want to do if / url is requseted with get request..

//TOUR ROUTER IS A MIDDLEWARE SO WE HAVE PASSED IT IN APP.USE WHICH WILL BE CALLED WHEN IT HITS THIS ROUTE. AND THEN WE
//HAVE ADDED MORE MIDDLEWARE TO THIS INSTANCE OF ROUTER.

app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/', viewRouter);
//APP.ALL() DEFINES FOR ALL TYPE OF APP.METHOD() LIKE APP.GET() AND APP.POST()
//SINCE MIDDLEWARE ARE CALLED IN ORDER THEY ARE DEFINED IN THE CODE SO THIS MIDDLEWARE WILL BE CALLED IF NONE
//OF THE SPECIFIED ROUTE IS CALLED . A REQUEST RESPONSE CYCLE ENDS WITH RES.SEND OR RES.JSON

app.all('*', (req, res, next) => {
  const err = new AppError(
    `the requested URL ${req.originalUrl} not found on this server`,
    404
  );
  next(err);
});

//MAKING A GLOBAL ERROR HANDLING function
app.use(errorHandler);

module.exports = app;
