const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { title } = require('process');
const redisClient = require('../app'); // ✅ Import Redis Client


const stripe = require('stripe')('sk_test_51NDU6LSD5QYUJLGVtCfK7wDkJsUdPY13MlXMhFFpEpNAEJXH62jchvBi1BnvAbtNAwe5twenOghQl7YaVKFM2e3000WpAZPDGW');
const perPage = 8;

exports.getProducts = async (req, res, next) => {
    try {
        if (!redisClient) {
            throw new Error('Redis client is not initialized.');
        }

        console.log('🟡 Checking Redis Cache...');
        const cachedMovies = await redisClient.v4.get('movies');

        //console.log('🔵 Cached Data from Redis:', cachedMovies); // ✅ DEBUGGING LOG

        if (cachedMovies) {
            console.log('🚀 Serving from Redis Cache ✅');
            return res.render('shop/product-list', {
                prods: JSON.parse(cachedMovies), // ✅ Ensure JSON parsing is correct
                pageTitle: 'All Movies',
                path: '/products',
            });
        }

        // ✅ 2. Fetch from MongoDB if Not Cached
        console.log('📦 Fetching from MongoDB and storing in Redis...');
        const products = await Product.find().sort({ title: 1 });

        // ✅ 3. Store Data in Redis with Expiry Time (1 hour)
        const cacheResult = await redisClient.v4.set('movies', JSON.stringify(products), { EX: 3600 });

        if (cacheResult) {
            console.log('✅ Successfully cached in Redis!');
        } else {
            console.log('❌ Failed to cache in Redis.');
        }

        res.render('shop/product-list', {
            prods: products,
            pageTitle: 'All Movies',
            path: '/products',
        });
    } catch (err) {
        console.error('❌ Error fetching products:', err);
        next(err);
    }
};

exports.getProduct = async (req, res, next) => {
    try {
        const prodId = req.params.productId;

        // ✅ Check if the product exists in Redis Cache
        const cachedProduct = await redisClient.v4.get(`product:${prodId}`);

        if (cachedProduct) {
            console.log(`🚀 Serving Product ${prodId} from Redis Cache`);
            return res.render('shop/product-detail', {
                product: JSON.parse(cachedProduct),
                pageTitle: JSON.parse(cachedProduct).title,
                path: '/products',
            });
        }

        // ✅ If not in cache, fetch from MongoDB
        console.log(`📦 Fetching Product ${prodId} from MongoDB`);
        const product = await Product.findById(prodId);

        if (!product) {
            console.log(`❌ Product ${prodId} Not Found`);
            return res.redirect('/products');
        }

        // ✅ Store the product in Redis with expiry (e.g., 1 hour)
        await redisClient.v4.set(`product:${prodId}`, JSON.stringify(product), { EX: 3600 });

        res.render('shop/product-detail', {
            product: product,
            pageTitle: product.title,
            path: '/products',
        });

    } catch (err) {
        console.error('❌ Error fetching product:', err);
        next(err);
    }
};

exports.getIndex = (req, res, next) => {
    let page = +req.query.page;
    if(!page) page = 1;
    let totalProducts;
    Product.find().countDocuments()
        .then(numProducts => {
            totalProducts = numProducts;
            return Product.find().skip((page - 1)*perPage).limit(perPage);
        })
        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Home',
                path: '/',
                page: page,
                lastPage: Math.ceil(totalProducts/perPage)
            });
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCart = (req, res, next) => {
    // console.log(req.user);
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products,
            });
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            //   console.log(result);
            res.redirect('/cart');
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


exports.getCheckout = (req, res, next) => {
    let products, total = 0;
    req.user
        .populate('cart.items.productId')
        .then(user => {
            products = user.cart.items;
            total = products.reduce((t , p) => {
                    return t+= p.productId.price*p.quantity;
                } , 0);
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode:'payment',
                line_items: products.map(p => {
                    return {
                        price_data:{
                            currency: 'usd',
                            product_data:{
                                name:p.productId.title,
                                description:p.productId.description
                            },
                            unit_amount:p.productId.price*100,
                        },
                        quantity: p.quantity
                    }
                }),
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            });
        }).then((session) => {
            console.log(products);
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total,
                sessionId : session.id
            });
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
}

exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Bookings',
                orders: orders,
            });
        })
        .catch(err => {
            console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if (!order) return next(new Error('No order found.'));
        if (order.user.userId.toString() != req.user._id.toString()) return res.redirect('/');

        const invoiceName = `invoice-${orderId}.pdf`;
        const invoicePath = path.join('data', 'invoices', invoiceName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);

        const pdfDoc = new PDFDocument();
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        
        const now = new Date();
        const formattedDate = now.toLocaleDateString();
        const formattedTime = now.toLocaleTimeString(); 

        pdfDoc.fontSize(26).text('Invoice', {
            underline: true,
            align: 'center',
            lineGap: 1
        });
        pdfDoc.fontSize(12).text(`Date: ${formattedDate}  |  Time: ${formattedTime}`, {
            align: 'center',
            lineGap: 5
        });

        pdfDoc.text('-------------------------------------', {
            lineGap: 5
        });

        let totalSum = 0;
        let itemCount = 1;

        order.products.forEach(product => {
            const itemTotal = product.quantity * product.product.price;
            totalSum += itemTotal;

            pdfDoc.fontSize(14).text(
                `#${itemCount} ${product.product.title} (${product.quantity} x ₹${product.product.price.toFixed(2)}) = ₹${itemTotal.toFixed(2)}`,
                { lineGap: 2 }
            );
            itemCount++;
        });

        pdfDoc.text('-------------------------------------', {
            lineGap: 5
        });

        pdfDoc.fontSize(14).text(`Total Amount: ₹${totalSum.toFixed(2)}`, {
            align: 'right'
        });

        pdfDoc.end();
    }).catch(err => {
        return next(new Error(err));
    });
};
