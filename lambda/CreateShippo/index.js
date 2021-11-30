const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;
const shippo = require("shippo")(process.env.SHIPPO_APIKEY);
const util = require("util");

exports.handler = async (event) => {
    console.log("[EVENT] event: " + JSON.stringify(event));
    let body = "";
    if (event.body !== null) {
        console.log("[EVENT] event.body: " + event.body);
        console.log("[EVENT] event.body.type: " + typeof(event.body));
        if (typeof(event.body) === "string") {
            body = JSON.parse(event.body);
        } else {
            body = event.body;
        }
    } else {
        console.log("[EVENT] event.body is null");
        if (typeof(event) === "string") {
            body = JSON.parse(event);
        } else {
            body = event;
        }
    }
    const customerAddr = setCustomerAddress(body.user);
    const shippoParcel = await shippo.parcel.create({
        length: 20,
        width: 20,
        height: 2,
        distance_unit: "in",
        weight: 2,
        mass_unit: "lb"
    });
    const parcel = shippoParcel;
    //const parcel = body.parcel;
    const order_id = body.orderId;
    let metadata = JSON.stringify({
        "order_id": order_id,
    });
    console.log(customerAddr);
    
    const storeAddr = await getStoreAddress(body.store_id);
    if (storeAddr === null) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                "message": "Store address not found or error"
            }),
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            }
        };
    }
    console.log("[CREATE_SHIPPO] storeAddr: " + util.inspect(storeAddr));

    const shipment = await shippo.shipment.create({
        "address_from": storeAddr,
        "address_to": customerAddr,
        "parcels": [parcel],
        "async":false,
        "metadata": metadata
    }, function(err, shipment) {
        if (err) {
            console.log("[SHIPPO] create error: " + JSON.stringify(err));
        } else {
            console.log("[SHIPPO] create success: " + JSON.stringify(shipment));
        }
    });
    console.log("[SHIPMENT] shipment: " + JSON.stringify(shipment));
    console.log("[SHIPMENT] metadata: " + JSON.stringify(shipment.metadata));
    
    let rate = shipment.rates[0];
    console.log("[RATES] shipment rates: " + JSON.stringify(shipment.rates));
    console.log("[RATES] shipment type: " + typeof(shipment.rates));
    for (let i = 0; i < shipment.rates.length; i++) {
        console.log("[RATES] shipment rates [" + i + "]: " + JSON.stringify(shipment.rates[i]));
        if ((shipment.rates[i].provider.toUpperCase().trim() === "USPS") && Array.from(shipment.rates[i].attributes).includes("CHEAPEST")){
            console.log("[RATES] cheapest found");
            rate = shipment.rates[i];
            break;
        }
    }
    console.log("[RATES] selected rate: " + JSON.stringify(rate));
    
    const transaction = await shippo.transaction.create({
        "rate": rate.object_id,
        "label_file_type": "PDF",
        "metadata": metadata,
        "async": false
    }, function(err, transaction) {
        if (err) {
            console.log("[SHIPPO] transaction error: " + JSON.stringify(err));
        } else {
            console.log("[SHIPPO] transaction success: " + JSON.stringify(transaction));
        }
    });

    console.log("[TRANSACTION] transaction: " + JSON.stringify(transaction));

    const tracking_status = convertStatus(transaction.tracking_status);

    if (tracking_status === -1) {
        console.log("[TRANSACTION] tracking_status error: " + tracking_status);
        return {
            statusCode: 500,
            body: JSON.stringify({
                "error": "Shippo tracking_status error"
            })
        };
    } 
    const bUpdate = await updateCustomerOrder({
        "order_id": order_id,
        "status": tracking_status,
        "carrier": rate.provider,
        "tracking_number": transaction.tracking_number,
        "tracking_url": transaction.tracking_url_provider,
        "label_url": transaction.label_url,
        "shippo_id": transaction.object_id,
        "updated_at": new Date().toISOString()
    });
    
    if (!bUpdate) {
        console.log("[UPDATE_ORDER] update failed");
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "dynamo update failed"
            })
        };
    } else {
        console.log("[UPDATE_ORDER] update success");
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            trackingNumber: transaction.tracking_number,
            trackingUrl: transaction.tracking_url_provider,
            labelUrl: transaction.label_url,
            orderStatus: transaction.tracking_status,
            parcelId: transaction.parcel,
            rateId: transaction.rate,
            rateAmount: rate.amount,
            rateCurrency: rate.currency,
        }),
        headers: {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            'Access-Control-Allow-Credentials': true,
            "Content-Type": "application/json"
        }
    };
};

// HELPER FUNCTIONS //

// Returns the store data from DynamoDB
const getStoreAddress = async (storeId) => {
    console.log("[GET_STORE_ADDRESS] storeId: " + storeId);
    const params = {
      Key: {
       "storeId": {
         S: storeId
        }, 
      }, 
      TableName: process.env.STORE_TABLE
     };
    const data =  await dynamo.getItem(params, function(err, data) {
        if (err) {
            console.log("[GET_STORE_ADDRESS] error: " + JSON.stringify(err));
            return null;
        } else {
            console.log("[GET_STORE_ADDRESS] success: " + JSON.stringify(data));
            return {
                "city": data.Item.city.S,
                "zip": data.Item.zip.S,
                "state": data.Item.province.S,
                "country": data.Item.country.S,
                "street1": data.Item.street1.S,
                "phone": data.Item.phone.N,
                "email": data.Item.email.S,
                "store_id": data.Item.storeId.S,
                "name": data.Item.storeName.S,
                "company": data.Item.company.S
            };
        }
    }).promise();
    try {
        console.log("[GET_STORE_ADDRESS] data stringify: " + JSON.stringify(data));
    }
    catch (err) {
        console.log("[GET_STORE_ADDRESS] exception: " + err);
    }
    console.log("[GET_STORE_ADDRESS] data: " + util.inspect(data));
    return {
        "city": data.Item.city.S,
        "zip": data.Item.zip.S,
        "state": data.Item.province.S,
        "country": data.Item.country.S,
        "street1": data.Item.street1.S,
        "phone": data.Item.phone.N,
        "email": data.Item.email.S,
        "store_id": data.Item.storeId.S,
        "name": data.Item.storeName.S,
        "company": data.Item.company.S
    };
};

// Sets the customer data to a format that Shippo can use
const setCustomerAddress = (data) => {
    console.log("[SET_CUSTOMER_ADDRESS] data: " + data);
    return {
        'name': data.name,
        'street1': data.street1,
        'city': data.city,
        'state': data.state,
        'zip': data.zip,
        'country': data.country,
        'phone': data.phone,
        'email': data.email
    };
}

// Updates the customer order in DynamoDB
const updateCustomerOrder = async (data) => {
    console.log("[CREATE_CUSTOMER_ORDER] data: " + JSON.stringify(data));
    let bStatus = true;
    const res = await dynamo.updateItem({
        ReturnConsumedCapacity: 'TOTAL',
        TableName: process.env.ORDER_TABLE,
        Key: {
            "orderId": {
                S: data.order_id
            }
        },
        UpdateExpression: "set statues = :status, carrier = :carrier, trackingNumber = :tracking_number, trackingUrl = :tracking_url, labelUrl = :label_url, shippoId = :shippo_id, updatedAt = :updated_at",
        ExpressionAttributeValues: {
            ":status": {
                N: data.status.toString()
            },
            ":carrier": {
                S: data.carrier
            },
            ":tracking_number": {
                S: data.tracking_number
            },
            ":tracking_url": {
                S: data.tracking_url
            },
            ":shippo_id": {
                S: data.shippo_id
            },
            ":updated_at": {
                S: data.updated_at
            },
            ":label_url": {
                S: data.label_url
            }
        },
    }, (err, data) => {
        if (err) {
            console.log("[CREATE_CUSTOMER_ORDER] error: " + err);
            bStatus = false;
        } else {
            console.log("[CREATE_CUSTOMER_ORDER] success: " + data);
        }
    }
    ).promise();
    console.log("[CREATE_CUSTOMER_ORDER] dynamo response: " + res);
    return bStatus;
};

// Converts a shippo tracking status to an integer
const convertStatus = (status) => {
    if (status === "UNKNOWN") {
        return 0;
    } else if (status === "PRE_TRANSIT") {
        return 1;
    } else if (status === "TRANSIT") {
        return 2;
    } else if (status === "DELIVERED") {
        return 3;
    } else if (status === "RETURNED") {
        return 4;
    } else if (status === "FAILURE") {
        return 5;
    }
    return -1;
};