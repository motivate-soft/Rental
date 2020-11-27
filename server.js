const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./connection');
const bodyParser = require('body-parser');
const passport = require("passport");
const users = require("./routes/api/users");
const rentals = require("./routes/api/rentals");
const cors = require('cors');
const app = express();
const rc = require("./Backend/rentalcalculator");//kch
// connectDB();

mongoose.connect('mongodb://localhost:27017/Information', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
    console.log('connected to MongoDB.....')
})

app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())
// Passport middleware
app.use(passport.initialize());
// Passport config
require("./config/passport")(passport);
app.use(cors());
app.use('/api/users', users);
app.use('/api/rentals',rentals);
// app.use('/api/users/rentalCalculator', rc);
// app.use('/api/user/auth', users);
// app.use('/api/user/auth',users);
// app.use('/api/user/auth',users);

const port = process.env.Port || 5000;
app.listen(port, () => {
    console.log('Listening on port ' + port + '....')
});