const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIfeatures = require('../utils/apiFeatures');

//whenever deleteDoc will be called it will retur the function which will be called when some user hit our route..
//This works because of javascript closures as even though the inner function have returned to Tourcontroller then also it will
//have access to Model variable because of closures..
exports.deleteDoc = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with this id', 404));
    }
    res.status(204).json({ status: 'success', data: null });
  });

exports.updateDoc = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return next(new AppError('the required tour does not exist', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.createDoc = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({ status: 'success', data: { data: doc } });
  });

exports.getOneDoc = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) {
      query = query.populate(popOptions);
    }
    const doc = await query;
    //findById is same as Tour.findOne({_id:req.param.id})
    if (!doc) {
      return next(new AppError('the required tour does not exist', 404));
    }
    res.status(200).json({ status: 'success', data: { data: doc } });
  });

exports.getAllDoc = (Model) =>
  catchAsync(async (req, res, next) => {
    // console.log(typeof queryStr, typeof query);
    //A PROJECTION MUST EITHER BE INCLUSIVE OR EXCLUSIVE . THAT IS WHY SELECT('-__v') OUTSIDE WILL NOT WORK IF REQ.QUERY.FIELDS
    //IF BLOCK IS RUN

    //LIMIT SPECIFIES THE MAXIMUM NUMBER OF DOCUMENTS QUERY WILL RETURN..
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIfeatures(Model.find(filter), req.query)
      .filter()
      .sorting()
      .fields()
      .pagination();
    const doc = await features.query;
    res.status(200).json({
      status: 'success',
      no_of_results: doc.length,
      requestAt: req.requestTime,
      data: {
        data: doc,
      },
    });
  });
