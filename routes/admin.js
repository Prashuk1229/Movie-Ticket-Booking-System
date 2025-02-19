const express = require('express');
const { check } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const isAdmin = require('../middleware/is-admin'); 

const router = express.Router();

router.get('/add-product', isAuth, isAdmin, adminController.getAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.post(
    '/add-product',
    [
        check('title').isString().isLength({ min: 3 }).trim(),
        check('price').isFloat({ min: 0 }),
        check('description').isString().isLength({ max: 512 }).trim(),
    ],
    isAuth,
    isAdmin, 
    adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, isAdmin, adminController.getEditProduct);

router.post(
    '/edit-product',
    isAuth,
    isAdmin,
    [
        check('title').isString().isLength({ min: 3 }).trim(),
        check('price').isFloat({ min: 0 }),
        check('description').isString().isLength({ max: 512 }).trim(),
    ],
    adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, isAdmin, adminController.deleteProduct);

module.exports = router;
