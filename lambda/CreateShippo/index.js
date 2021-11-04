const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;

exports.handler = async (event) => {
    var body = event.body;
    var customerAddr = setCustomerAddress(body);
    
    var storeAddr = await getStoreAddress("admin@gmail.com");
    console.log(storeAddr);
    
    const response = {
        statusCode: 200,
        body: {
            tracking_number: "string",
            tracking_url: "url",
            shippo_id: "asdf",
            order_status: "PRE-TRANSIT"
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

const getStoreAddress = async (storeId) => {
    console.log("[GET_STORE_ADDRESS] storeId: " + storeId);
    var params = {
      Key: {
       "email": {
         S: storeId
        }, 
      }, 
      TableName: process.env.STORE_TABLE
     };
    var data =  await dynamo.getItem(params).promise();
    console.log("[GET_STORE_ADDRESS] dynamo response: " + data);
    return data;
};

const setCustomerAddress = (data) => {
    console.log("[SET_CUSTOMER_ADDRESS] data: " + data);
    var name = data.first_name + " " + data.last_name;
    return {
        'name': name,
        'street1': data.street1,
        'city': data.city,
        'state': data.state,
        'zip': data.zip,
        'country': data.country,
        'phone': data.phone,
        'email': data.email
    };
}