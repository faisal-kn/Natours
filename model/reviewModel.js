const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review is required'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'A review must have a rating'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    //this is parent referencing as each review knows which tour it belong to but each tour does not know about it reviews
    //and many reviews it have.parent referencing is used because our array can grow indefinetely.
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must be about a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must have a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
//we do not want a user to write a review to same tour multiple times . so a review must have the combination of userId and tourId different..

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//Population is the process of automatically replacing the specified paths in the document
//with document(s) from other collection(s).
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

//whenever a new review is added we want to calc the average rating and also update the number of rating.
//they are called on model..
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //this points to current model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        numRatings: { $sum: 1 },
        avgRatings: { $avg: '$rating' },
      },
    },
  ]);
  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats[0].numRatings,
    ratingsAverage: stats[0].avgRatings,
  });
};
//we have used post because otherwise our document will not appear in collection and therefore not match in match stage
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

//we also want to update the tour document ratings when document is updated or deleted..
reviewSchema.post(/^findOneAnd/, (doc) => {
  doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model('reviews', reviewSchema);

module.exports = Review;
