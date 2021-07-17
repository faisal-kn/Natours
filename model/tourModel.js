const mongoose = require('mongoose');
const slugify = require('slugify');
const validators = require('validator');

/*
USE OF SCHEMA:-
Each schema maps to a MongoDB collection and defines the shape of the documents within that collection.
*/
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      maxlength: [40, 'A name should have max length 40 characters'],
      validate: [
        function (val) {
          return validators.isAlpha(val, 'en-US', { ignore: ' ' });
        },
        'name should contain letters from a-z or A-Z',
      ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      //enum -values allowed
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy medium or difficult',
      },
    },

    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'A tour must have a minimum rating of 0'],
      max: [5, 'A tour must have maximum rating of 5'],
      set: (val) => val.toFixed(1),
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    //DEFINING CUSTOM VALIDATORS
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value) {
          //this points in validators to current document in only creating new document and not updating the document.
          return value <= this.price;
        },
        message:
          'Discount price ({VALUE}) cannot be greater than price of the tour',
      },
    },
    summary: {
      type: String,
      trim: true, //will remove all the whitespace in the beginning and at the end
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    //THIS OBJECT IS GEOSPATIAL JSON..
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    //THIS IS HOW WE CREATE EMBEDDED DOCUMENTS. WE DEFINE A ARRAY..
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    // reviews: [{ type: mongoose.Schema.ObjectId, ref: 'Review' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//Setting up indexs to increase the read performance of our data..
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
//we need a index to the field we are doing geo-spatial query..
tourSchema.index({ startLocation: '2dsphere' });

//VIRTUAL POPULATE-IT WILL TELL US EACH REVIEW RELATED TO A TOUR . BUT IT WILL NEVER PERSIST IN DATABASE SO OUR PROBLEM
//CREATED WITH CHILD REFERENCING WILL NOT OCCUR...

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
//USE OF SLUG-A slug is a human-readable, unique identifier,used to identify a resource instead of a less human-readable
//identifier like an id.
//DOCUMENT MIDDLEWARE : RUNS BEFORE .SAVE() AND .CREATE() AND NOT FOR UPDATE
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//WILL RUN AFTER DOCUMENT IS SAVED AND GET ACCESS TO DOC .ALSO KNOWN AS POST-SAVE HOOK..
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
// });

//QUERY MIDDLEWARE ALLOWS US TO RUN FUNCTIONS BEFORE AND AFTER A CERTAIN FUNCTION IS EXECUTED.
tourSchema.pre(/^find/, function (next) {
  this.populate({ path: 'guides', select: '-__v' });
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
