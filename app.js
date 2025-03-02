require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const RedisStore = require('connect-redis').default; 
const redis = require('redis');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const crypto = require('crypto');
const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

//Initialize Redis Client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    legacyMode: true, // Required for compatibility
});

redisClient.connect()
    .then(() => console.log('✅ Connected to Redis!'))
    .catch(err => console.error('❌ Redis Connection Error:', err));

redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err);
});

module.exports = redisClient;

// MongoDB Session Store 
const MONGO_URI = process.env.MONGODB_URI;
const mongoStore = new MongoDBStore({
    uri: MONGO_URI,
    collection: 'sessions'
});

// Configure Session Storage with Redis
const sessionStore = process.env.USE_REDIS === 'true' ? new RedisStore({ client: redisClient }) : mongoStore;

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set `true` if using HTTPS
}));

// File Upload Configuration
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

app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

app.use(csrf());
app.use(flash());

// Middleware to Handle User Authentication Data
app.use(async (req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn || false;
    res.locals.csrfToken = req.csrfToken();
    res.locals.role = null;

    if (!req.session.user) {
        return next();
    }

    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            return next();
        }
        req.user = user;
        res.locals.role = user.role;
        next();
    } catch (err) {
        next(new Error(err));
    }
});

// Routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/', (req, res) => {
    res.redirect('/shop');
});

// Error Handling
app.use(errorController.get404);
app.use((error, req, res, next) => {
    console.error('❌ Internal Server Error:', error);
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500',
        isAuthenticated: req.session ? req.session.isLoggedIn : false
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully!');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Failed:', err);
    });
