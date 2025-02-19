require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const crypto = require('crypto'); 
const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();
const MONGO_URI = process.env.MONGODB_URI;
const store = new MongoDBStore({
    uri: MONGO_URI,
    collection: 'sessions'
});


const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, crypto.randomBytes(6).toString('hex') + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};


app.set('view engine', 'ejs');
app.set('views', 'views');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));


app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
}));


app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));


app.use(csrf());
app.use(flash());


app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn || false;
    res.locals.csrfToken = req.csrfToken();
    res.locals.role = null; 

    if (!req.session.user) {
        return next();
    }

    User.findById(req.session.user._id)
        .then(user => {
            if (!user) {
                return next();
            }
            req.user = user;
            res.locals.role = user.role;
            next();
        })
        .catch(err => {
            next(new Error(err));
        });
});


const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);


app.get('/', (req, res) => {
    res.redirect('/shop');
});


app.use(errorController.get404);


app.use((error, req, res, next) => {
    console.error('Internal Server Error:', error);
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
        isAuthenticated: req.session ? req.session.isLoggedIn : false
    });
});

const PORT = process.env.PORT || 3000;
mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB successfully!');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB Connection Failed:', err);
    });
