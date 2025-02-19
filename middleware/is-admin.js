module.exports = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    
    if (req.session.user.role !== 'admin') {
        return res.status(403).render('403', {
            pageTitle: 'Access Denied',
            path: '/403',
            isAuthenticated: req.session.isLoggedIn
        });
    }
    
    next();
};
