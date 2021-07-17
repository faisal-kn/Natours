const crypto = require('crypto');
const mongoose = require('mongoose');
const validators = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'A user must have a email'],
    unique: [true, 'email should be unique'],
    lowercase: true,
    validate: [
      function (val) {
        return validators.isEmail(val);
      },
      'It is not a valid email',
    ],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'A password is a must'],
    minlength: 8,
    select: false,
  },
  confirmPassword: {
    type: String,
    //REQUIRED ONLY MEANS IT IS A REQUIRED FIELD AND NOT REQUIRED TO BE PERSISTED IN DATABASE
    required: [true, 'Please confirm your password'],
    //THIS VALIDATE IS ONLY RUN ON SAVE AND CREATE . SO WHEN UPDATING MAKE SURE TO USE SAVE AND NOT FINDBYIDANDUPDATE.
    validate: {
      validator: function (pass) {
        return this.password === pass;
      },
      message: 'Password do not match .Please enter again',
    },
  },
  passwordCreatedAt: Date,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
    lowercase: true,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  //HASH THE PASSWORD WITH COST OF 12
  this.password = await bcrypt.hash(this.password, 11);
  this.confirmPassword = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  //SOMETIMES JSON WEB TOKEN IS CREATED BEFORE SAVE SO OUR CONSDITION IN PROTECT WILL FAIL SO WE INTRODUCED A SMALL HACK..
  this.passwordCreatedAt = Date.now() - 1000;
  next();
});
//QUERY MIDDLEWARE ONLY DIFFERENCE FROM DOCUMENT MIDDLEWARE IS THAT IN QUERY MIDDLEWARE THE THIS KEYWORD POINTS TO THE
//QUERY OBJECT..
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

//INSTANNCE METHOD:-
/*
A method that will be available on all documents on a certain collection .this keyword points to current document.
*/
userSchema.methods.checkPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.passwordChangedAfter = function (JWTtimestamp) {
  if (this.passwordCreatedAt) {
    const changeTimestamp = parseInt(
      this.passwordCreatedAt.getTime() / 1000,
      10
    );
    return JWTtimestamp < changeTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  //EXPIRES IN 10 MINUTES.
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

/*
USE OF MODEL:- 
Models are fancy constructors compiled from Schema definitions. An instance of a model is called a document. 
Models are responsible for creating and reading documents from the underlying MongoDB database.
*/
/*
USE OF FIRST ARGUMENT:-
The first argument is the singular name of the collection your model is for. 
Mongoose automatically looks for the plural, lowercased version of your model name. 
*/
const User = mongoose.model('User', userSchema);
module.exports = User;
