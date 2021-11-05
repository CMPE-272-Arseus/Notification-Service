var AWS = require("aws-sdk");
var shippo = require("shippo")(process.env.SHIPPO_APIKEY);

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    body = JSON.parse(event.body);
};