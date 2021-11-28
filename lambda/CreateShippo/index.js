const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB;
const shippo = require("shippo")(process.env.SHIPPO_APIKEY);
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
    console.log("[EVENT] event: " + JSON.stringify(event));
    let body = "";
    if (event.body !== null) {
        console.log("[EVENT] event.body: " + event.body);
        body = JSON.parse(event.body);
    } else {
        console.log("[EVENT] event.body is null");
        body = JSON.parse(event);
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
    const order_id = body.order_id;
    let metadata = JSON.stringify({
        "order_id": order_id,
    });
    console.log(customerAddr);
    
    const storeAddr = await getStoreAddress(body.store_id);

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

    const bUpdate = await updateCustomerOrder({
        "order_id": order_id,
        "user_id": body.user.user_id,
        "status": transaction.tracking_status,
        "carrier": rate.provider,
        "tracking_number": transaction.tracking_number,
        "tracking_url": transaction.tracking_url_provider,
        "label_url": transaction.label_url,
        "shippo_id": transaction.object_id,
        "created_at": new Date().toISOString(),
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
    }
    
    const response = {
        statusCode: 200,
        body: {
            tracking_number: transaction.tracking_number,
            tracking_url: transaction.tracking_url_provider,
            label_url: transaction.label_url,
            order_status: transaction.tracking_status,
            parcel_id: transaction.parcel,
            rate_id: transaction.rate,
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
        "store_id": data.Item.store_id.S,
        "name": data.Item.name.S,
        "company": data.Item.company.S
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

const updateCustomerOrder = async (data) => {
    console.log("[CREATE_CUSTOMER_ORDER] data: " + JSON.stringify(data));
    let bStatus = false;
    const res = await dynamo.putItem({
        ReturnConsumedCapacity: 'TOTAL',
        TableName: process.env.ORDER_TABLE,
        Item: {
            "order_id": {
                S: data.order_id
            },
            "user_id": {
                S: data.user_id
            },
            "order_status": {
                S: data.status
            },
            "carrier": {
                S: data.carrier
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
            bStatus = false;
        } else {
            console.log("[CREATE_CUSTOMER_ORDER] success: " + JSON.stringify(data));
            bStatus = true;
        }
    }
    ).promise();
    console.log("[CREATE_CUSTOMER_ORDER] dynamo response: " + JSON.stringify(res));
    return bStatus;
};