const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../model/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

const createSendToken = function (user, statusCode, req, res, token) {
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //COOKIE CANNOT BE MODIFIED IN ANYWAY BY THE BROWSER..
    httpOnly: true,
    secure: req.secure || req.headers('x-forwarded-proto') === 'https',
  };
  //'jwt' is cookie name. it is identifier . if another cookie with same name is recieved then it will store the new cookie.
  res.cookie('jwt', token, cookieOptions);
  //confirmPassword was set to undefined before saving the document so it was not persisted to the database . but password
  //is just undefined before response so it is persisted in database.
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.signup = catchAsync(async (req, res, next) => {
  //THIS CREATES A NEW DOCUMENT USING MODEL .WE DO LIKE THIS SO THAT NO ONE CAN APPLY A ADMIN ROLE TO HIMSELF AND OTHER THINGS
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    passwordCreatedAt: req.body.passwordCreatedAt,
    role: req.body.role,
  });
  //FIRST ARGUMENT IS PAYLOAD,SECOND IS SECRET,THIRD IS OPTIONS ON=BJECT
  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const url = `${req.protocol}://${req.get('host')}/me#`;
  new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res, token);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide us your email and password', 400));
  }
  //NOW FIND THE USER WITH THIS EMAIL AND password
  //WE HAVE TO DO SELECT(+PASSWORD) BECAUSE PASSWORD IS NOT IN THE DOCUMENT SO WE NEED TO INCLUDE IT FIRST..
  const user = await User.findOne({ email: email }).select('+password');
  //401 MEANS UNAUTHORIZED.
  if (!user || !(await user.checkPassword(password, user.password)))
    return next(new AppError('Incorrect email or password.', 401));

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  createSendToken(user, 200, req, res, token);
});

//the token is provided as header to the server.so use it from there.
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // console.log(req.cookies);
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    //now we also able to autorize user by cokie sent to us and not only by authorization headers..
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in . Please log in to get access', 401)
    );
  }
  //Verify if token is correct...in jwt.verify if we specify callback then it is asynchronous function and otherwise synchronous function. so we must need some way
  //to allow it to run asynchronously without specifying callback.
  //If original is a function but its last argument is not an error-first callback, it will still be passed an error-first callback as its last argument.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //CHECK IF USER EXISTS CURRENTLY.
  const user = await User.findById(decoded.id);
  if (!user)
    return next(
      new AppError(
        'User belonging to this token has been deleted from our database',
        401
      )
    );
  //CHECK IF USER CHANGED PASSWORD AFTER THE TOKEN WAS ISSUED.
  if (user.passwordChangedAfter(decoded.iat)) {
    return next(
      new AppError('Password has been changed .Please log in again', 401)
    );
  }
  req.CurrentUser = user;
  res.locals.user = user;
  next();
});

//to determine if a user is logged in for all the pages , not only protected route ,so to display the signin and logout
//conditionally..
//authorization header is only for our api . cookie is for rendered pages..
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      //CHECK IF USER EXISTS CURRENTLY.
      const user = await User.findById(decoded.id);
      if (!user) return next();

      if (user.passwordChangedAfter(decoded.iat)) {
        return next();
      }
      res.locals.user = user;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
});

//IMPLEMENTING RESTRICTTO MIDDLEWARE. AT DIFFERENT PLACES DIFFERENT PEOPLE WILL GET ACCESS SO WE NEED A WAY TO PASS AN
//ARGUMENT TO THIS MIDDLEWARE.WE WILL USE CLOSURE FOR THIS.
exports.restrictTo = function (...allowed) {
  return function (req, res, next) {
    if (!allowed.includes(req.CurrentUser.role)) {
      return next(new AppError('You do not have permission to do this.', 403));
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('Email not found . Please try again', 404));
  //GENERATE A RANDOM TOKEN.
  const resetToken = user.createPasswordResetToken();
  //validateBeforeSave is necessary because we confirmPassword which is required and is not currently present in our document.
  await user.save({ validateBeforeSave: false });
  //WE WILL SEND THE RESET TOKEN TO THE USER EMAIL AND KEEP THE ENCRYPTED TOKEN IN OUR DATABASE. SO THAT IF SOME HACKER GAIN ACCESS
  //TO OUR DATABASE THEN HE WILL NOT GET RESET TOKEN TO RESET THE PASSWORD.
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetpassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res
      .status(200)
      .json({ status: 'success', message: 'Token sent to your email' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Problem in sending the email to the user', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //WE ONLY HAVE TOKEN TO IDENTIFY THE USER SO WE WILL USE IT.
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() },
  });
  if (!user) return next(new AppError('The token expired or is invalid', 400));
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //PREVIOUS TIME THE ERROR COMES IN SAVE OF THE DOCUMENT BECAUSE CONFIRM PASSWORD IS KEPT
  await user.save();

  //CHANGE THE CHANGETPASSWORDAT FIELD OF THE DATABASE HAVE INTRODUCED PRE-SAVE HOOK.
  //LOG THE USER IN..
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  createSendToken(user, 200, req, res, token);
});

//UPDATING THE PASSWORD WHEN THE USER IS LOGGED IN.. WE WILL NEED TO CONFIRM PASSWORD BECAUSE OUR WEBSITE CAN BE OPEN AND
//SOMEONE CAN CHANGE PASSWORD
exports.updatePassword = catchAsync(async (req, res, next) => {
  //GET USER FROM COLLECTION..
  const user = await User.findById(req.CurrentUser._id).select('+password');
  //CHECK IF POSTED PASSWORD IS SAME AS USER PASSWORD.

  const candidatePassword = req.body.passwordCurrent;
  if (!(await user.checkPassword(candidatePassword, user.password))) {
    return next(
      new AppError(
        'Current password entered is incorrect. please try again',
        400
      )
    );
  }
  //UPDATE THE PASSWORD
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  //USING THIS SO THAT OUR PRE-SAVE HOOKS WORK...
  await user.save();
  //LOGGING OUR USER BACK IN BY SENDING NEW JWT..
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  createSendToken(user, 200, req, res, token);
});
