var request = require("request");
var _ = require("underscore");
const config = require('./config.json');
const fs = require('fs');
const calculator = require('./calculator.js');
const fileName = './property.json';
const file = require(fileName);
const express = require("express");
const router = express.Router();


//const defaults = request.defaults({'proxy':'http://172.25.1.2:3129'});
exports.callCalculator = function(address){    
    var options1 = {
        method: 'GET',
        url: 'https://realtor.p.rapidapi.com/properties/list-for-sale',      
        qs: {
            sort: 'relevance',
            city: address.city,//'Natick',
            offset: '0',
            limit: '200',
            state_code: address.stateCode
        },
        
        headers: {
            'x-rapidapi-host': config.RapidApiHost,
            'x-rapidapi-key': config.RapidApiKey,
            useQueryString: true
        }
    };
    return;
    request(options1, function(error, response, body) {
        if (error) throw new Error(error);
        var json = response.body;
        var values = JSON.parse(json);
        console.log(values);
        var property = _.where(values.listings, {
            'address': address.formatedAddress//'71 Summer St Unit C in Downtown Natick, Natick, 01760'
        })
        var property_id = property[0].property_id;
        var listing_id = property[0].listing_id;
    
        const options2 = {
            method: 'GET',
            url: 'https://rapidapi.p.rapidapi.com/properties/detail',
            qs: {
                listing_id: listing_id,
                prop_status: 'for_sale',
                property_id: property_id
            },
            headers: {
                'x-rapidapi-host': config.RapidApiHost,
                'x-rapidapi-key': config.RapidApiKey,
                useQueryString: true
            }
        };
    
        request(options2, function(error, response, body) {
            if (error) throw new Error(error);
            var json = response.body;
            var values = JSON.parse(json);
    
            var market_price = values.listing.price;
            var unitInfo = _.where(values.listing.features, {
                'category': 'Multi-Unit Info'
            });
            if (unitInfo === undefined || unitInfo.length == 0) {
                var numberofUnits = 1;
            } else {
                var units = (unitInfo[0].text).toString();
                numberofUnits = units.split(": ").pop();
            }
            //console.log(Number_Of_Units);
    
            var zip_code = values.listing.address.postal_code;
            var hoa_fee = values.listing.hoa_fee;
            var monthly_payment = values.listing.mortgage.estimate.monthly_payment;
            var monthly_home_insurance = values.listing.mortgage.estimate.monthly_home_insurance;
            var annual_home_insurance = monthly_home_insurance * 12;
    
            const options3 = {
                method: 'GET',
                url: 'https://rapidapi.p.rapidapi.com/finance/rates',
                qs: {
                    loc: zip_code
                },
                headers: {
                    'x-rapidapi-host': config.RapidApiHost,
                    'x-rapidapi-key': config.RapidApiKey,
                    useQueryString: true
                }
            };
            request(options3, function(error, response, body) {
                if (error) throw new Error(error);
                var json = response.body;
                var values = JSON.parse(json);
                var property_tax_rate = values.rates.property_tax;
                var insurance_rate = values.rates.insurance_rate;
                var thirtyyearrate = values.rates.average_rate_30_year;
                var fifteenyearrate = values.average_rate_15_year;
                var chmc_fee = 0;
                var downpayment = 20;
                var principle_borrowed = market_price - (market_price * 0.2);
    
                var total_monthly_payment = calculator.financing(principle_borrowed, thirtyyearrate, 30, 0);
    
    
                const options4 = {
                    method: 'GET',
                    url: 'https://rapidapi.p.rapidapi.com/mortgage/calculate',
                    qs: {
                        hoi: monthly_home_insurance,
                        tax_rate: property_tax_rate,
                        price: market_price,
                        downpayment: market_price * 0.1,
                        term: '30.0',
                        rate: thirtyyearrate
                    },
                    headers: {
                        'x-rapidapi-host': config.RapidApiHost,
                        'x-rapidapi-key': config.RapidApiKey,
                        useQueryString: true
                    }
                };
                request(options4, function(error, response, body) {
                    if (error) throw new Error(error);
                    var json = response.body;
                    var values = JSON.parse(json);
                    var first_Mortgage_Monthly_Payment = values.mortgage.principal_and_interest;
                    var property_tax_annual = (values.mortgage.monthly_property_taxes) * 12;
    
                    file.PropertyId = property_id;
                    file.ListingId = listing_id;
                    file.FairMarketValue = market_price;
                    file.NumberOfUnits = numberofUnits;
                    file.OfferPrice = market_price;
                    file.RealPurchasePrice = calculator.rpp(Number(file.OfferPrice), Number(file.Repairs), Number(file.RepairsContingency), Number(file.LenderFee), Number(file.BrokerFee), Number(file.Environmentals), Number(file.InspectionsEngineerReport), Number(file.Appraisals), Number(file.Misc), Number(file.TransferTax), Number(file.Legal));
                    file.PrincipleAmount = principle_borrowed;
                    file.InterestRate = thirtyyearrate;
                    file.AmortizationPeriod = 30;
                    file.CHMCFee = chmc_fee;
                    file.MortgageMonthlyPayment = total_monthly_payment;
                    file.CashRequiredToCloseAfterFinancing = calculator.closingCost(Number(file.RealPurchasePrice), Number(file.PrincipleAmount));
                    file.TotalIncome = calculator.totalIncome(Number(file.GrossRents), Number(file.Parking), Number(file.Storage), Number(file.LaundryVending), Number(file.OtherIncome));
                    file.VacancyLoss = calculator.vacancyLoss(Number(file.TotalIncome), Number(file.VacancyRate));
                    file.EffectiveGrossIncome = calculator.effectiveGrossIncome(Number(file.TotalIncome), Number(file.VacancyLoss));
                    file.PropertyTax = property_tax_annual;
                    file.Insurance = annual_home_insurance;
                    file.RepairsExpense = file.GrossRents * 10 / 100;
                    file.Advertizing = calculator.advertizing(Number(file.NumberOfUnits), Number(file.VacancyRate), Number(file.AdvertizingCostPerVacancy));
                    file.AssociationFee = hoa_fee;
                    file.PestControl = calculator.pestControl(Number(file.NumberOfUnits));
                    file.Security = calculator.security(Number(file.NumberOfUnits), Number(file.VacancyRate));
                    file.Evictions = calculator.evictions(Number(file.NumberOfUnits), Number(file.VacancyRate));
                    file.TotalOperatingExpenses = calculator.annualOperatingExpenses(Number(file.PropertyTax), Number(file.Insurance), Number(file.RepairsExpense), Number(file.Electricity), Number(file.Gas), Number(file.LawnSnowMaintenance), Number(file.WaterSewer), Number(file.Cable), Number(file.Management), Number(file.Caretaking), Number(file.Advertizing), Number(file.AssociationFee), Number(file.PestControl), Number(file.Security), Number(file.TrashRemoval), Number(file.CommonAreaMaintenance), Number(file.CapitalImprovements), Number(file.Accounting), Number(file.BadDebts), Number(file.Evictions));
                    file.NetOperatingIncome = calculator.netOperatingIncome(Number(file.EffectiveGrossIncome), Number(file.TotalOperatingExpenses));
                    file.CashRequiredToClose = calculator.cashrequiredToClose(Number(file.CashRequiredToCloseAfterFinancing), Number(file.DepositsMadeWithOffer));
                    file.TotalCashRequired = calculator.totalCashRequired(Number(file.DepositsMadeWithOffer), Number(file.LessProRationOfRents), Number(file.CashRequiredToClose));
                    file.DebtServicingCosts = calculator.debtServicingCosts(Number(file.MortgageMonthlyPayment), Number(file.OtherMonthlyFinanceCost));
                    file.AnnualProfitOrLoss = calculator.annualProfitOrLoss(Number(file.NetOperatingIncome), Number(file.DebtServicingCosts));
                    file.TotalMonthlyProfitOrLoss = calculator.monthlyProfitOrLoss(Number(file.AnnualProfitOrLoss));
                    file.CashFlowPerUnitPerMonth = calculator.cashFlowPerUnitPerMonth(Number(file.TotalMonthlyProfitOrLoss), Number(file.NumberOfUnits));
                    file.MortgageLTV = calculator.mortgageLTV(Number(file.PrincipleAmount), Number(file.FairMarketValue));
                    file.MortgageLTPP = calculator.mortgageLTPP(Number(file.PrincipleAmount), Number(file.OfferPrice));
                    file.CapRateOnPP = calculator.capRateOnPP(Number(file.NetOperatingIncome), Number(file.OfferPrice));
                    file.CapRateOnFMV = calculator.capRateOnFMV(Number(file.NetOperatingIncome), Number(file.FairMarketValue));
                    file.AverageRent = calculator.averageRent(Number(file.GrossRents), Number(file.NumberOfUnits));
                    file.GRM = calculator.grm(Number(file.OfferPrice), Number(file.GrossRents));
                    file.DCR = calculator.dcr(Number(file.NetOperatingIncome), Number(file.DebtServicingCosts));
                    file.CashOnCashROI = calculator.cashOnCashROI(Number(file.AnnualProfitOrLoss), Number(file.TotalCashRequired));
                    file.AppreciationROIAfterOneYear = calculator.appreciationROI(Number(file.FairMarketValue), Number(file.AnnualAppreciationRate), Number(file.TotalCashRequired));
                    file.TotalROIAfterOneYear = calculator.totalROI(Number(file.CashOnCashROI),Number(file.EquityROIAfterOneYear),Number(file.AppreciationROIAfterOneYear),Number(file.TotalCashRequired));
                    file.ForcedAppROIAfterOneYear = calculator.forcedAppROI(Number(file.FairMarketValue),Number(file.RealPurchasePrice),Number(file.TotalCashRequired));
                    file.ExpenseToIncomeRatio = calculator.expenseToIncomeRatio(Number(file.EffectiveGrossIncome), Number(file.TotalOperatingExpenses));
    
                    
                // router.get("/rentalCalulator", async (req, res) => {
                    fs.writeFile(fileName, JSON.stringify(file), function writeJSON(err) {
                        if (err) return console.log(err);
                        var updatedJson = JSON.stringify(file);
                        console.log(JSON.parse(updatedJson));
                        console.log('writing to ' + fileName);
                       // res.console.send(200).JSON.parse(updatedJson)
                    });
                    //  router.get('/', (req, res) => {
                    //     fs.readFile(JSON.stringify(file),'utf8', (err,updatedJson) => {
                    //         if(err){
                    //             console.log("error");
                    //             // throw err;
                    //         }
                    //         updatedJson= JSON.stringify(file);
                    //         console.log(JSON.parse(updatedJson));
                    //         console.log('writing to ' );
                    //         res.send(200).json((JSON.parse(updatedJson)));
                    //     })
    
                    //  })
                     
                //
                });
            });
        });
    });
}

exports.router = router;
