const path = require('path');
const express = require('express');

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');

const router = express.Router();
const Product = require('../models/product'); 


router.get('/', shopController.getIndex);

//  Movie Listings
router.get('/products', shopController.getProducts);
router.get('/products/:productId', shopController.getProduct);

//  Cart Routes 
router.get('/cart', isAuth, shopController.getCart);
router.post('/cart', isAuth, shopController.postCart);
router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

//  Bookings Routes 
router.get('/orders', isAuth, shopController.getOrders);
router.get('/orders/:orderId', isAuth, shopController.getInvoice);
router.post('/create-order', isAuth, shopController.postOrder);

//  Checkout Routes 
router.get('/checkout', isAuth, shopController.getCheckout);
router.get('/checkout/success', isAuth, shopController.getCheckoutSuccess);
router.get('/checkout/cancel', isAuth, shopController.getCheckout);

router.get("/search", async (req, res) => {
    try {
        let query = req.query.q || ''; 
        const perPage = 10; 
        const page = req.query.page || 1; 
        const products = await Product.find({
            $or: [ 
                { title: { $regex: query, $options: "i" } }, 
                { description: { $regex: query, $options: "i" } } 
            ]
        })
        .skip((perPage * page) - perPage) 
        .limit(perPage); 
        
        const totalProducts = await Product.countDocuments({
            $or: [ 
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ]
        });

        const lastPage = Math.ceil(totalProducts / perPage); 

        let pageTitle = `Search Results for "${query}"`;
        let path = '/search'; 

        res.render("shop", { 
            prods: products, 
            pageTitle, 
            path,
            lastPage,
            page, 
            query 
        });

    } catch (err) {
        console.error("Error searching products:", err);
        res.status(500).send("Internal Server Error");
    }
});



module.exports = router;
