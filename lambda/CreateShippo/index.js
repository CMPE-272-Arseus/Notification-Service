const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;
const shippo = require("shippo")(process.env.SHIPPO_APIKEY);
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
    const body = event.body;
    const customerAddr = setCustomerAddress(body.user);
    const parcel = body.parcel;
    console.log(customerAddr);
    
    const storeAddr = await getStoreAddress(body.store_id);

    const shipment = await shippo.shipment.create({
        "address_from": storeAddr,
        "address_to": customerAddr,
        "parcels": [parcel],
        "async":false
    }, function(err, shipment) {
        if (err) {
            console.log("[SHIPPO] create error: " + err);
        } else {
            console.log("[SHIPPO] create success: " + shipment);
        }
    });
    console.log("[SHIPMENT] shipment: " + shipment);
    const order_id = uuid();

    //const rate = shipment.rates[0];
    console.log(shipment.rates);
    // const transaction = shippo.transaction.create({
    //     "rate": rate.object_id,
    //     "label_file_type": "PDF",
    //     "metadata": {
    //         "order_id": order_id
    //     },
    //     "async": false
    // }, function(err, transaction) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         console.log(transaction);
    //     }
    // });

    // createCustomerOrder({
    //     "order_id": order_id,
    //     "user_id": body.user.user_id,
    //     "status": "created",
    //     "tracking_number": transaction.tracking_number,
    //     "tracking_url": transaction.tracking_url,
    //     "shippo_id": transaction.object_id,
    //     "created_at": new Date().toISOString(),
    //     "updated_at": new Date().toISOString()
    // });
    
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
    const params = {
      Key: {
       "store_id": {
         S: storeId
        }, 
      }, 
      TableName: process.env.STORE_TABLE
     };
    const data =  await dynamo.getItem(params).promise();
    console.log("[GET_STORE_ADDRESS] dynamo response: " + JSON.stringify(data));
    return {
        "city": data.Item.city.S,
        "zip": data.Item.zip.S,
        "state": data.Item.state.S,
        "country": data.Item.country.S,
        "street1": data.Item.street1.S,
        "store_name": data.Item.store_name.S,
        "phone": data.Item.phone.S,
        "email": data.Item.email.S,
        "store_id": data.Item.store_id.S
    };
};

const setCustomerAddress = (data) => {
    console.log("[SET_CUSTOMER_ADDRESS] data: " + data);
    const name = data.first_name + " " + data.last_name;
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

const createCustomerOrder = async (data) => {
    console.log("[CREATE_CUSTOMER_ORDER] data: " + data);
    dynamo.putItem({
        TableName: process.env.ORDER_TABLE,
        Item: {
            "order_id": {
                S: data.order_id
            },
            "user_id": {
                S: data.user_id
            },
            "order_status": {
                S: "PRE_TRANSIT"
            },
            "tracking_number": {
                S: data.tracking_number
            },
            "tracking_url": {
                S: data.tracking_url
            },
            "shippo_id": {
                S: data.shippo_id
            },
            "created_at": {
                S: data.created_at
            },
            "updated_at": {
                S: data.updated_at
            }
        }
    }, (err, data) => {
        if (err) {
            console.log("[CREATE_CUSTOMER_ORDER] error: " + err);
        } else {
            console.log("[CREATE_CUSTOMER_ORDER] success: " + data);
        }
    }
    );
};