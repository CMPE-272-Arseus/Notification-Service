const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;
const shippo = require("shippo")(process.env.SHIPPO_APIKEY);
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
    console.log("[EVENT] event: " + JSON.stringify(event));
    //const order_id = body.order_id;
    
    const orderData = await getOrderData(body.store_id);
    const carrier = orderData.carrier;
    const tracking_number = orderData.tracking_number;

    const shippoData = fetch(`https://api.shippo.com/shipments/${carrier}/${tracking_number}/`, {
        method: 'GET',
        headers: {
            'Authorization': 'ShippoToken ' + process.env.SHIPPO_APIKEY,
            'Content-Type': 'application/json'
        }
    }).then(response => {
        return response.json();
    }).then(data => {
        console.log(data);
    }).catch(err => {
        console.log(err);
    });

    const response = {
        statusCode: 200,
        body: {
            data: shippoData,
        },
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
       "order_id": {
         S: orderID
        }, 
      }, 
      TableName: process.env.ORDER_TABLE
     };
    const data =  await dynamo.getItem(params).promise();
    console.log("[GET_ORDER_DATA] dynamo response: " + JSON.stringify(data));
    return {
    };
};