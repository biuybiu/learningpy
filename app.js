//jshint esversion:6
require('dotenv').config(); //the module to use environment variables
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy; //use it as a passport strategy
const passportLocalMongoose = require('passport-local-mongoose');
const cookieParser = require('cookie-parser');

//////////////////////////
// const saltRounds = 10;
const uri = 'mongodb://127.0.0.1:27017/userDB';
const app = express();
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SECRET_SESSION,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }, //is this line which cause the problem of the false isAuthenticated()
  })
);
app.use(passport.initialize()); //init passport package
app.use(passport.session()); //dealing with sessions
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.set('strictQuery', false);
mongoose.connect(uri);

// console.log(process.env.SECRET);//to show the variable that we added to the (.env file)
//////////////////////////////////////////
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});
// const secret = 'Thisisourlittlesecret'; //Need to delete this line bc we've removed it to the .env file
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model('User', userSchema);
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user, done) {
  done(null, user); //序列化
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(null, user);
  });
  //反序列化
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, //bc is a environement variable
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

///////////////////////////////////////
app.get('/', (req, res) => {
  res.render('home');
});
///////////////////////////////////////////
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
); //this should allow us to bring a popup for user to login in using google acc
/////////////////////////////////////////////////
app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  }
);

//
app.get('/login', (req, res) => {
  res.render('login');
});
app.post('/login', (req, res) => {
  // req.sesion._passport;
  //creat a new user
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  //and then use passport (to create a login session) to login the user and authenticate it
  req.login(user, (err) => {
    if (err) {
      console.log(err);
      res.redirect('/');
    } else {
      passport.authenticate('local')(req, res, () => {
        console.log('signed in');
        res.redirect('/secrets');
      });
    }
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});
//
app.post('/register', function (req, res) {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password,
    (err) => {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    }
  );
});

app.get('/secrets', (req, res) => {
  User.find({ secret: { $ne: null } }, (err, foundUsers) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.get('/submit', (req, res) => {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/');
  }
});

////////////////////////////////
app.post('/submit', (req, res) => {
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(() => {
          res.redirect('/secrets');
        });
      }
    }
  });
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (!err) {
      res.redirect('/');
    } else {
      res.redirect('/secrets');
    }
  });
});

///////////////////////////////////////////////
app.listen(3000, () => {
  console.log(
    '///////////////////////////////////////////////////////\nlistening on port 3000'
  );
});
