const Product = require('../models/product');

module.exports =  (req, res, next) => {
    if (!req.session.user) return res.redirect('/');
    let prodId;
    if(req.body.productId) prodId = req.body.productId;
    if(req.params.productId) prodId = req.params.productId;
    Product.findOne({ _id: prodId })
        .then(product => {
            if (!product || req.session.user._id.toString() != product.userId) res.redirect('/');
            else next();
        })
}  