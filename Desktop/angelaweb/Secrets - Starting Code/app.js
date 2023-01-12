//jshint esversion:6
require('dotenv').config(); //the module to use environment variables
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrpt = require('mongoose-encryption'); //module to encrpt the password

//////////////////////////
const uri = 'mongodb://127.0.0.1:27017/userDB';
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.set('strictQuery', false);
mongoose.connect(uri);
// console.log(process.env.SECRET);//to show the variable that we added to the (.env file)
//////////////////////////////////////////
const userSchema = new mongoose.Schema({ email: String, password: String });
// const secret = 'Thisisourlittlesecret'; //Need to delete this line bc we've removed it to the .env file
userSchema.plugin(encrpt, {
  secret: process.env.SECRET,
  encryptedFields: ['password'],
});
const User = mongoose.model('User', userSchema);

///////////////////////////////////////
app.get('/', (req, res) => {
  res.render('home');
});

app
  .route('/register')
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    const newUser = new User({
      email: req.body.username,
      password: req.body.password,
    });

    newUser.save((err) => {
      if (!err) {
        res.render('secrets');
      } else {
        res.send('404');
      }
    });
  });
app
  .route('/login')
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    const userName = req.body.username;
    const password = req.body.password;

    User.findOne({ email: userName }, (err, foundUser) => {
      if (foundUser) {
        if (foundUser.email === userName && foundUser.password === password) {
          res.render('secrets');
        } else {
          console.log(err);
        }
      }
    });
  });
app.get('/secrets', (req, res) => {
  res.render('secrets');
});
app.get('/submit', (req, res) => {
  res.render('submit');
});

app.listen(3000, () => {
  console.log('listening on port 3000');
});
