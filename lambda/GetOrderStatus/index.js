const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;
const shippo = require("shippo")(process.env.SHIPPO_APIKEY);
const fetch = require('node-fetch');

exports.handler = async (event) => {
    console.log("[EVENT] event: " + JSON.stringify(event));
    const order_id = event.queryStringParameters.orderId;
    
    const orderData = await getOrderData(order_id);
    const carrier = orderData.carrier;
    const tracking_number = orderData.trackingNumber;

    const shippoData = await fetch("https://api.goshippo.com/tracks/", {
                            body: `carrier=${carrier}&tracking_number=${tracking_number}`,
                            headers: {
                            Authorization: `ShippoToken ${process.env.SHIPPO_APIKEY}`,
                            "Content-Type": "application/x-www-form-urlencoded"
                            },
                            method: "POST"
                        })
    console.log("[SHIPPO_DATA] shippoData: " + JSON.stringify(shippoData));
    
    const response = {
        statusCode: 200,
        body: JSON.stringify({data: shippoData}),
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            'Access-Control-Allow-Credentials': true
        }
    };
    return response;
};

const getOrderData = async (orderID) => {
    console.log("[GET_ORDER_DATA] orderID: " + orderID);
    const params = {
      Key: {
       "orderId": {
         S: orderID
        }, 
      }, 
      TableName: process.env.ORDER_TABLE
     };
    const data =  await dynamo.getItem(params).promise();
    console.log("[GET_ORDER_DATA] dynamo response: " + JSON.stringify(data));
    return {
        "carrier": data.Item.carrier.S,
        "trackingNumber": data.Item.trackingNumber.S,
    };
};