const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../model/tourModel');
const catchAsync = require('../utils/catchAsync');
const Review = require('../model/reviewModel');
const handlerFactory = require('./handlerFactory');
const AppError = require('../utils/appError');

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

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();
  const coverFileName = `tours-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/tours/${coverFileName}`);

  req.body.imageCover = coverFileName;
  req.body.images = [];
  //now we need to process the images
  await Promise.all(
    req.files.images.map(async (image, i) => {
      const imageName = `tours-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(image.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`./public/img/tours/${imageName}`);
      req.body.images.push(imageName);
    })
  );
  next();
});

exports.cheapAlias = function (req, res, next) {
  req.query.limit = '5';
  req.query.sort = 'price,-ratingsAverage';
  req.query.fields = 'name,ratingsAverage,price,duration';
  next();
};

//REFACTORING OUR CODE

exports.getAllTours = handlerFactory.getAllDoc(Tour);

exports.newTours = handlerFactory.createDoc(Tour);

exports.updateTour = handlerFactory.updateDoc(Tour);

exports.getTour = handlerFactory.getOneDoc(Tour, {
  path: 'reviews',
  model: Review,
  select: '-createdAt -__v',
});

exports.deleteTour = handlerFactory.deleteDoc(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4.4 } } },

    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numtours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        minRatings: { $min: '$ratingsAverage' },
        maxRatings: { $max: '$ratingsAverage' },
      },
    },
    // {
    //   $addFields: { hardness: '$_id' },
    // },
    {
      $project: {
        hardness: '$_id',
        numtours: '$numtours',
        numRatings: '$numRatings',
        avgRatings: '$avgRatings',
        avgPrice: '$avgPrice',
        minPrice: '$minPrice',
        maxPrice: '$maxPrice',
        minRatings: '$minRatings',
        maxRatings: '$maxRatings',
        _id: 0,
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({ status: 'success', data: { stats } });
});
// eslint-disable-next-line prettier/prettier

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;
  const monthlyTour = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        noOfTours: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: {
          $let: {
            vars: {
              monthsInString: [
                '',
                'january',
                'febuary',
                'march',
                'april',
                'may',
                'june',
                'july',
                'august',
                'september',
                'october',
                'november',
                'december',
              ],
            },
            in: {
              $arrayElemAt: ['$$monthsInString', '$_id'],
            },
          },
        },
      },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { noOfTours: -1 },
    },
  ]);
  res.status(200).json({ status: 'success', data: { monthlyTour } });
});

// /tours-within/:distance/center/:latlng/unit/:unit
exports.getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.2;
  if (!lat || !lng) {
    return next(
      new AppError(
        'The latitude and longitude are not provided correctly please provide them in format lat,lng',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    no_of_results: tours.length,
    data: { data: tours },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'The latitude and longitude are not provided correctly please provide them in format lat,lng',
        400
      )
    );
  }
  //mongodb gives results in meters.
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  const tours = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'point',
          coordinates: [+lng, +lat],
        },
        distanceField: 'distance_from_coordinate',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        name: 1,
        distance_from_coordinate: '$distance_from_coordinate',
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    no_of_results: tours.length,
    data: { data: tours },
  });
});
