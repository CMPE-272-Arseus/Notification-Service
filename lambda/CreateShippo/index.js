const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;
const shippo = require("shippo")(process.env.SHIPPO_APIKEY);
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
    const body = event.body;
    const customerAddr = setCustomerAddress(body.user);
    const parcel = body.parcel;
    const order_id = uuid();
    console.log(customerAddr);
    
    const storeAddr = await getStoreAddress(body.store_id);

    const shipment = await shippo.shipment.create({
        "address_from": storeAddr,
        "address_to": customerAddr,
        "parcels": [parcel],
        "async":false,
        "metadata": {
            "order_id": order_id
        }
    }, function(err, shipment) {
        if (err) {
            console.log("[SHIPPO] create error: " + JSON.stringify(err));
        } else {
            console.log("[SHIPPO] create success: " + JSON.stringify(shipment));
        }
    });
    console.log("[SHIPMENT] shipment: " + JSON.stringify(shipment));
    
    let rate = shipment.rates[0];
    for (let i = 0; i < shipment.rates.length; i++) {
        console.log("[SHIPMENT] shipment rates [" + i + "]: " + JSON.stringify(shipment.rates[i]));
        console.log("[SHIPMENT] provider bool: " + shipment.rates[i].provider.toUpperCase() === "USPS");
        console.log("[SHIPMENT] attributes bool: " + rate.attributes.includes("CHEAPEST",0));
        if (rate.provider.toUpperCase() === "USPS" && rate.attributes.includes("CHEAPEST",0)){
            console.log("[SHIPMENT] cheapest found");
            rate = shipment.rates[i];
            break;
        }
    }
    console.log("[SHIPMENT] shipment rates: " + JSON.stringify(shipment.rates));
    console.log("[SHIPMENT RATE] rate: " + JSON.stringify(rate));
    const transaction = await shippo.transaction.create({
        "rate": rate.object_id,
        "label_file_type": "PDF",
        "metadata": {
            "order_id": order_id
        },
        "async": false
    }, function(err, transaction) {
        if (err) {
            console.log("[SHIPPO] transaction error: " + JSON.stringify(err));
        } else {
            console.log("[SHIPPO] transaction success: " + JSON.stringify(transaction));
        }
    });

    console.log("[TRANSACTION] transaction: " + JSON.stringify(transaction));

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