const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        isAuthenticated: false,
        errorMessage: req.flash('error')
    });
};
exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset',
        isAuthenticated: false,
        errorMessage: req.flash('error')
    });
};



exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        isAuthenticated: false,
        errorMessage: false,
        oldInput: {
            email: '',
            password: '',
            confirmPassword: '',
            role: 'user' // Default role as 'user'
        },
        validationErrors: []
    });
};

exports.postSignup = async (req, res, next) => {
    const { email, password, confirmPassword, role } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: { email, password, confirmPassword, role },
            validationErrors: errors.array()
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({
            email,
            password: hashedPassword,
            role, 
            cart: { items: [] }
        });
        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        console.log(err);
        next(err);
    }
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password.',
                    csrfToken: req.csrfToken(),
                });
            }
            bcrypt.compare(password, user.password).then(doMatch => {
                if (doMatch) {
                    req.session.isLoggedIn = true;
                    req.session.user = user;
                    return req.session.save(err => {
                        console.log(err);
                        res.redirect('/'); // 
                    });
                }
                res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password.',
                    csrfToken: req.csrfToken(), 
                });
            });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
};


exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect('/');
    });
};


exports.postResetRequest = async (req, res, next) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'No account with that email found.');
            return res.redirect('/reset');
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000; 

        await user.save();

        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS 
            }   
        });
        

        await transporter.sendMail({
            to: email,
            from: process.env.EMAIL,
            subject: 'Password Reset Link',
            html: `<p>You requested a password reset</p>
                   <p>Click this <a href="http://localhost:3000/resetPassword/${token}">link</a> to set a new password.</p>`
        });

        req.flash('success', 'Check your email for the reset link.');
        res.redirect('/login');

    } catch (err) {
        console.error('Error in password reset request:', err);
        next(err);
    }
};


exports.getNewPassword = async (req, res, next) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Invalid or expired reset token.');
            return res.redirect('/reset');
        }

        res.render('auth/resetPassword', {
            pageTitle: 'Reset Password',
            path: `/resetPassword/${token}`,
            token: token,
            csrfToken: req.csrfToken(),
            errorMessage: req.flash('error')
        });

    } catch (err) {
        console.error('Error loading reset form:', err);
        next(err);
    }
};

exports.postResetPassword = async (req, res, next) => {
    const { password, cPassword, token } = req.body;

    if (password !== cPassword) {
        req.flash('error', 'Passwords do not match!');
        return res.redirect(`/resetPassword/${token}`);
    }

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Invalid or expired token.');
            return res.redirect('/reset');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiration = undefined;

        await user.save();
        req.flash('success', 'Password reset successful! Please log in.');
        res.redirect('/login');

    } catch (err) {
        console.error('Error resetting password:', err);
        next(err);
    }
};
