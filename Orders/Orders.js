const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config();
const connectDb = require("./config/dbConnection");
const Order = require("./Order");

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

connectDb();

const port = process.env.PORT || 5002;

// GET all orders for a user
// GET single order for a user
app.get("/orders", async (req, res) => {
    
    if(!req.query.oid && req.query.uid) {
        try {
            const orders = await Order.find({customerId: req.query.uid});
            if(orders) {
                res.status(200).json({orders});
                return;
            } else {
                res.sendStatus(404);
                return;
            }
        } catch (error) {
            res.sendStatus(500);
            return;
        }

    } else if(req.query.oid && req.query.uid) {
        try {
            const order = await Order.find({_id: req.query.oid, customerId: req.query.uid});
            if(order) {
                res.status(200).json({order});
                return;
            } else {
                res.sendStatus(404);
                return;
            }
        } catch (error) {
            res.sendStatus(500);
            return;
        }
        
    }
})

// Create an order for a user
app.post("/order", async (req, res) => {
    const newOrder = {
        "name": req.body.name,
        "customerId": req.body.customerId,
        "amount": req.body.amount,
        "image": req.body.image,
        "createdAt": req.body.createdAt,
        "qty": req.body.qty,
    }

    // Create new Order instance..
    const order = new Order(newOrder);
    order.save().then((orderObj) => {    
        res.status(200).json({orderObj});
        return;
    }).catch((err) => {
        if(err) {
            res.sendStatus(500);
        }
    })
})

// Delete a single order
app.delete("/orders/:oid", async (req, res) => {
    Order.findByIdAndDelete(req.params.oid).then(() => {
        res.send("Order deleted with success...");
    }).catch( () => {
        res.sendStatus(404);
    })
})

// Delete all orders for a user
app.delete("/orders", async (req, res) => {
    try {
        const orders = Order.findById({customerId: req.query.uid});
        if(!orders) {
            res.status(404).json({message: "No Orders found"})
        }
        await Order.deleteMany({customerId: req.query.uid});
        res.status(200).json({success: true});
    } catch (error) {
        res.status(500).json({message: "Something went wrong while deleting orders"});
    }
})

// APP listening on port 5002
app.listen(port, () => {
    console.log("Up and running! -- This is our Orders service");
})