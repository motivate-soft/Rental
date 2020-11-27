const express = require('express');
const router = express.Router();
const { callCalculator } = require('../../Backend/rentalcalculator');

router.post("/calculator", async (req, res) => {    
    callCalculator(req.body);
    console.log(req.body);
    res.send(req.body);
  });
  
  module.exports = router;