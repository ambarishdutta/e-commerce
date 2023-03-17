const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv").config();
const connectDb = require("./config/dbConnection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./User");
const validateToken = require("./middleware/validateTokenHandler");
const CircularJSON = require('circular-json');
const { default: mongoose } = require("mongoose");

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

connectDb();

const port = process.env.PORT || 5001;

app.get("/", (req, res) => {
    res.send("This is our main endpoint")
})

// GET all Users
app.get("/users", async (req, res) => {
    User.find().then((users) => {
        res.status(200).json({ users })
    }).catch((err) => {
        if(err) {
            throw err;
        }
    })
});

// GET single user
app.get("/user", validateToken, async (req, res) => {
    User.findById(req.user.id).then((user) => {
        if(user){
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: "User not found"})
        }
    }).catch( err => {
        if(err) {
            throw err;
        }
    })
})

// GET all orders for an user 
app.get("/users/orders", validateToken, async (req, res) => {
    try {
        const getOrderEcomURL = `${process.env.ORDERECOMURL}/orders?uid=${req.user.id}`;
        const response = await axios.get(getOrderEcomURL);
        const JSONresponse = CircularJSON.stringify(response.data);
        const JSONResponseData = CircularJSON.parse(JSONresponse);
        res.status(200).json({JSONResponseData});
        return;
    } catch (error) {
        res.status(404).json({message: error})
        return;
    }
})

// Create new user
app.post("/registeruser", async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = {
        "firstName": req.body.firstName,
        "lastName": req.body.lastName,
        "password": hashedPassword,
        "email": req.body.email,
        "phone": req.body.phone,
        "address": req.body.address,
        "orders": req.body.orders
    }

    const user = new User(newUser);
    user.save().then((r) => {
        res.send("User created");
    }).catch((err) => {
        if(err) {
            throw err
        }
    })
})

// Login user
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) {
        res.status(400);
        throw new Error("All fields are mandatory!");
    }
    const user = await User.findOne({ email });
    // compare password and hashedpassword
    if(user && (await bcrypt.compare(password, user.password))) {
        const accessToken = jwt.sign({
            user: {
                firstName: user.firstName,
                email: user.email,
                id: user.id
            }
        }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "15m"});
        res.status(200).json({ accessToken });
    } else {
        res.status(401);
        throw new Error("Email or password is not valid");
    }
    
})

// Create new order for a user
app.post("/users/order", validateToken, async (req, res) => {
    try {
        const orderResponse = await axios.post(`${process.env.ORDERECOMURL}/order`,{
            name: req.body.name,
            customerId: req.user.id,
            amount: req.body.amount,
            image: req.body.image,
            createdAt: req.body.createdAt,
            qty: req.body.qty
        })
        if(orderResponse.status === 200) {
            try {
                const user = await User.findById(req.params.uid);
                user.orders.push(orderResponse.data.orderObj._id);
                user.save().then(() => {
                    res.status(200).json({message:`Order created for user: ${user.email} with orderId: ${orderResponse.data.orderObj._id}`});
                    return;
                }).catch(e => {
                    res.status(500).json({message: "Failed to add orderId in user's doc"});
                    return;
                })

            } catch (error) {
                res.status(500).json({message: "Something went wrong!!"})
            }
        } else {
            res.status(200).json({message: "Order not created.."});
        }
    } catch (error) {
        res.sendStatus(400).json({message: "Error while creating the order"})
    }
})

// Delete user by userId
app.delete("/users", async (req, res) => {
    const user = User.findById(req.user.id);
    if (!user) {
        res.status(404).json({message: "User not found"});
    }
    await User.deleteOne({_id: req.params.uid});
    res.status(200).json({message: `${user} deleted`});
})

// Delete all the orders for an user
app.delete("/users/orders", async (req, res) => {
    try {
        const delRes = await axios.delete(`${process.env.ORDERECOMURL}/orders?uid=${req.user.id}`);
        if(delRes.data.success) {
            res.status(200).json({message: "Orders deleted.."});
        } else {
            res.status(404).json(delRes.data);
        }
    } catch (error) {
        res.status(500).json({message: `${error}`});
    }
})

app.listen(port, () => {
    console.log("Up and running! -- This is our Users service");
})

