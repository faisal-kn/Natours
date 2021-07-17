const multer = require('multer');
const sharp = require('sharp');
const User = require('../model/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

//determines where the files are to be stored and also keeps the filename
// const multerStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './public/img/users');
//   },
//   filename: function (req, file, cb) {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.CurrentUser.id}-${Date.now()}.${ext}`);
//   },
// });

//it will store the image in memory so that it is available later when sharping it is easily available
const multerStorage = multer.memoryStorage();

//allows us to check if user only uploads images and nothing else
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('The file is not an image. Please upload a image', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

//resize the images to square so that fit as a circle in our website.
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.CurrentUser.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/users/${req.file.filename}`);
  next();
});

exports.getAllUsers = handlerFactory.getAllDoc(User);

exports.getUser = handlerFactory.getOneDoc(User);
//ADMINISTRATOR UPDATING ALL THE DOCUMENT..
exports.updateUser = handlerFactory.updateDoc(User);

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.CurrentUser._id);
  if (!user) return next(new AppError('The current User does not exist', 404));
  res.status(200).json({ status: 'success', data: { aboutUser: user } });
});

//USER UPDATING HIS DOCUMENT...
exports.updateMe = catchAsync(async (req, res, next) => {
  //Check if user is not trying to update password..
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'Password updation is not allowed through here.Please use /update/password',
        400
      )
    );
  }
  //UPDATE THE REQUIRED PROPERTIES OF THE USER..
  //since only some fields are allowed to be changed by user we need to be cautious and get only that property out..
  const { name, email } = req.body;
  let filteredObj;
  if (!name) {
    filteredObj = {
      email,
    };
  } else if (!email) {
    filteredObj = {
      name,
    };
  } else {
    filteredObj = {
      email,
      name,
    };
  }

  if (req.file) filteredObj.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(
    req.CurrentUser._id,
    filteredObj,
    {
      new: true,
      //This will not run the custom validators..
      runValidators: true,
    }
  );
  res.status(200).json({ status: 'success', updatedUser });
});

exports.deleteCurrentUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.CurrentUser._id, {
    active: false,
  });
  res.status(204).json({ status: 'success', data: null });
  //NOW WE WANT IF THERE IS EVER A REQUEST TO FIND THIS USER IT SHOULD NOT BE FOUND. SO QUERY MIDDLEWARE IS PERFECT FOR THIS
  //TYPE OF THINGS ..
});

exports.deleteUser = handlerFactory.deleteDoc(User);
