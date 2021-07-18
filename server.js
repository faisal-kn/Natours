const mongoose = require('mongoose');
//Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env
const dotenv = require('dotenv');

//IT WILL READ VARIABLES FROM THE FILE AND SAVE THEM TO NODE.JS ENVIRONMENT VARIABLE. they will be available in all the files.
dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((_) => {
    console.log('database successfully connected');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`listening to requests on port ${port}`);
});

//WAY TO HANDLE UNHANDLED REJECTIONS -IF THERE IS ERROR IN CONNECTION IN DATABASE FOR EXAMPLE
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('SHUTTING DOWN THE SERVER');
  server.close(() => {
    process.exit(1);
  });
});

process.on('SUGTERM', () => {
  console.log('🤦‍♂️🤦‍♂️SIGTERM recieved SHUTTING DOWN the server');
  server.close(() => {
    console.log('process terminated');
  });
});
