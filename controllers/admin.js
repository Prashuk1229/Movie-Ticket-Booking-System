const Product = require('../models/product');
const { validationResult } = require('express-validator');
const fileHelper = require('../util/file');
const path = require('path');


exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Movie',
        path: '/admin/add-product',
        editing: false,
        product: { title: '', description: '', price: 0 },
        errorMessage: false,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    console.log('function called');
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    console.log(image);
    const errors = validationResult(req);
    console.log(errors.array());
    if(errors.array().length){
        const err =  errors.array()[0].msg;
        return res.status(422).render('admin/edit-product' , {
            path: '/admin/add-product',
            pageTitle: 'Add Movie',
            editing: false,
            product: {
                title : title,
                description:description,
                price:price
            },
            errorMessage: err,
            validationErrors: errors.array()
        })
    }
    if(!image){
        return res.status(422).render('admin/edit-product' , {
            path: '/admin/add-product',
            pageTitle: 'Add Movie',
            editing: false,
            product: {
                title : title,
                description:description,
                price:price
            },
            errorMessage: 'Attached file is not an image',
            validationErrors: []
        })
    }
    const imageUrl = image.path;

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId:  req.session.user._id
    });

    console.log(product);
    product
        .save()
        .then(result => {
            console.log('Created Movie');
            res.redirect('/admin/products');
        })
        .catch(err => {
            console.log(error);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit === 'true'; 
    if (!editMode) {
        return res.redirect('/');
    }

    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/admin/products');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Movie',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                errorMessage: false,
                validationErrors: []
            });
        })
        .catch(err => {
            console.error("Error fetching movie:", err);
            return next(new Error(err));
        });
};


exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId; 
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedDesc = req.body.description;
    const image = req.file;
    const errors = validationResult(req);

    console.log(errors.array()); 

    if (errors.array().length) {
        const err = errors.array()[0].msg;
        return res.status(422).render('admin/edit-product', {
            path: '/admin/edit-product',
            pageTitle: prodId ? 'Edit Movie' : 'Add Movie',
            editing: !!prodId,
            product: {
                _id: prodId,
                title: updatedTitle,
                description: updatedDesc,
                price: updatedPrice
            },
            errorMessage: err,
            validationErrors: errors.array()
        });
    }

    if (prodId) { 
        Product.findById(prodId)
            .then(product => {
                if (!product) {
                    return res.redirect('/admin/products');
                }

                product.title = updatedTitle;
                product.price = updatedPrice;
                product.description = updatedDesc;

                if (image) {
                    
                    if (product.imageUrl) {
                        fileHelper.deleteFile(path.join(__dirname, '..', 'images', product.imageUrl));
                    }
                    product.imageUrl = image.filename;
                }

                return product.save();
            })
            .then(result => {
                console.log('UPDATED PRODUCT!');
                res.redirect('/admin/products');
            })
            .catch(err => {
                console.error("Error updating product:", err);
                return next(new Error(err));
            });
    } else { 
        const product = new Product({
            title: updatedTitle,
            price: updatedPrice,
            description: updatedDesc,
            imageUrl: image ? image.filename : null
        });

        product.save()
            .then(result => {
                console.log('ADDED NEW PRODUCT!');
                res.redirect('/admin/products');
            })
            .catch(err => {
                console.error("Error adding product:", err);
                return next(new Error(err));
            });
    }
};



exports.getProducts = (req, res, next) => {
    Product.find({userId: req.session.user._id})
        .then(products => {
            res.render('admin/products', {
                pageTitle: 'Admin Movies',
                path: '/admin/products',
                prods: products,  
                isAdmin: req.session.role === 'admin', 
                csrfToken: req.csrfToken() 
            });
        })
        .catch(err => console.log(err));
};



exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) throw new Error('Movie not found');

            fileHelper.deleteFile(product.imageUrl);
            return Product.findByIdAndRemove(prodId);
        })
        .then(() => res.status(200).json({ message: 'Success!' }))
        .catch(err => res.status(500).json({ message: 'FAIL!' }));
};

exports.getDashboard = (req, res, next) => {
    res.render('admin/dashboard', {
        pageTitle: 'Admin Dashboard',
        path: '/admin/dashboard',
    });
};
