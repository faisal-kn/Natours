//WRITING THESE FOUR ARGUMENTS TO FUNCTION EXPRESS WILL AUTOMATICALLY KNOW THAT IT IS A ERROR HANDLING MIDDLEWARE.
//A MIDDLEWARE GETS REQ,RES,NEXT BY ITSELF SO WHEN WE CALL THIS MIDDLEWARE USING NEXT WE WILL JUST PASS IN THE ERROR INTO IT.
const AppError = require('../utils/appError');

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res
        .status(err.statusCode)
        .json({ status: err.status, message: err.message });
    }
    return res
      .status(500)
      .json({ status: 'fail', message: 'Something went very wrong !!' });
  }
  if (err.isOperational) {
    console.log(err.message);
    return res
      .status(err.statusCode)
      .render('error', { title: 'Something went wrong !', msg: err.message });
  }
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong !',
    msg: 'Please try again after sometime!!!!',
  });
};

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      error: err,
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  } else {
    res
      .status(err.statusCode)
      .render('error', { title: 'Something went wrong !', msg: err.message });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    //IF ERROR NAME IS CAST ERROR THEN WE WANT TO SEND ERROR WITH IS ISOPERATIONAL PROPERTY SET TO TRUE AS CLIENT CAN CORRECT THEM.
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') {
      error = new AppError(`Invalid ${error.path}:${error.value}`, 400);
    }
    if (error.code === 11000) {
      error = new AppError(
        `Duplicate field value . Data with name :${error.keyValue.name} already exists`,
        400
      );
    }
    console.log(err);
    if (err._message === 'Validation failed') {
      error = new AppError(`A error occured , ${err.message}`, 400);
    }
    if (err.name === 'JsonWebTokenError') {
      error = new AppError(`Invalid Signature. Please login again`, 401);
    }
    if (err.name === 'TokenExpiredError') {
      error = new AppError(`Token expired . Please login again`, 401);
    }
    sendErrorProd(error, req, res);
  }
  next();
};
