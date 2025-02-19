const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true 
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    required: true,
    default: 'user' 
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: { type: Number, required: true }
      }
    ]
  }
});


userSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};


userSchema.methods.addToCart = function (product) {
  const cartProductIndex = this.cart.items.findIndex(cp => 
    cp.productId.toString() === product._id.toString()
  );

  if (cartProductIndex >= 0) {
    this.cart.items[cartProductIndex].quantity += 1;
  } else {
    this.cart.items.push({ productId: product._id, quantity: 1 });
  }

  return this.save();
};

userSchema.methods.removeFromCart = function (productId) {
  this.cart.items = this.cart.items.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  return this.save();
};


userSchema.methods.clearCart = function () {
  this.cart.items = [];
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
