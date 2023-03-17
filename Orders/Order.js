const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    customerId: {
        // type: mongoose.SchemaType.ObjectId,
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    },
    qty: {
        type: Number,
        required: false
    }
});

module.exports = mongoose.model("OrderEcom", orderSchema);