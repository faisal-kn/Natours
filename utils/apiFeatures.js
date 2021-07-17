const Tour = require('../model/tourModel');

class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //MONGOOSE WILL CONVERT IT TO JAVASCRIPT OBJECT BY ITSELF
    const queryObj = { ...this.queryString };
    const deletedQuery = ['page', 'sort', 'limit', 'fields'];
    deletedQuery.forEach((el) => {
      delete queryObj[el];
    });
    // const check = await Tour.find({ price: { $lte: 1000 } });
    //ADVANCED FILTERING
    let stringstr = JSON.stringify(queryObj);
    stringstr = stringstr.replace(
      /\b(gte|lt|lte|gt)\b/g,
      (match) => `$${match}`
    );
    //FIND METHOD RETURNS A QUERY SO WE CAN CHAIN METHODS OF QUERY.PROTOTYPE TO IT.
    this.query = this.query.find(JSON.parse(stringstr));
    //Tour.find().find(JSON.parse(queryStr)) is same as this . tour.find() will return a query object and we are chaining
    //another query to it.
    return this;
  }

  sorting() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('createdAt');
    }
    return this;
  }

  fields() {
    if (this.queryString.fields) {
      const field = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(field);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    console.log(this.queryString.limit);
    const limit = +this.queryString.limit || 100;
    const page = +this.queryString.page || 1;
    const skip = (page - 1) * limit;
    this.query.skip(skip).limit(limit);
    if (this.queryString.page) {
      Tour.countDocuments(this.queryString, (_, docno) => {
        if (skip >= docno) {
          //   res.status(400).json(status:'fail',message: 'This page does not exist');
          console.log('This page does not exist');
        }
      });
    }
    return this;
  }
}
module.exports = APIfeatures;
