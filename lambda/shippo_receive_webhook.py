import json
import logging
import boto3
import os

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

### Simple Lambda webhook response. Typically returns 200 unless something in the backend is wrong like a missing order_id or user_id.
def lambda_handler(event, context):
    eventBody = event['body']
    logger.debug("[EVENT] event: {}".format(eventBody))
    logger.debug("[TRACKER] event metadata: {}".format(eventBody['metadata']))
    logger.debug("[TRACKER] event: {}".format(eventBody['event']))
    logger.debug("[TRACKER_DATA] data: {}".format(eventBody['data']))

    print("[TRACKER_DATA] tracking_status: {}".format(eventBody['data']['tracking_status']))
    print("[TRACKER_DATA] tracking_number: {}".format(eventBody['data']['tracking_number']))
    print("[TRACKER_DATA] metadata: ".format(eventBody['data']['metadata']))

    order_id = None
    if metaDataExists(eventBody['data']['metadata']):
        metadata = eventBody['data']['metadata']
        metadata = metadata.split(' ')
        order_id = metadata[1]
    else:
        logger.error("[ERROR] metadata does not exist in request")
        raise Exception("metadata does not exist in request")
    
    # Get the Shippo order data from DynamoDB using the data from the metadata field
    order_data = getOrderResponse(order_id)
    logger.debug("[ORDER_DATA] order_data: {}".format(order_data))
    print("[ORDER_DATA] order_data: {}".format(order_data))

    email = getEmail(order_data['user_id'])
    order_id = order_data['order_id']
    tracking_number = order_data['tracking_number']
    
    return {
        'statusCode': 200,
        'body': json.dumps('Sent notification email to {}'.format(email))
    }

### HELPER FUNCTIONS ###

def getEmail(user_id):
    # Get the user data from DynamoDB using the user_id
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['USERS_TABLE'])
    response = table.get_item(
        Key={
            'user_id': user_id
        }
    )
    if "Item" not in response:
        logger.error("[ERROR] User data not found")
        raise Exception("User data not found")
    user_data = response['Item']
    logger.debug("[USER_DATA] user_data: {}".format(user_data))
    print("[USER_DATA] user_data: {}".format(user_data))
    return user_data['email']

def getOrderResponse(order_id):
    # Get the order data from DynamoDB using the order_id
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['ORDERS_TABLE'])
    response = table.get_item(
        Key={
            'order_id': order_id
        }
    )
    if "Item" not in response:
        logger.error("[ERROR] Order data not found")
        raise Exception("Order data not found")
    order_data = response['Item']
    logger.debug("[ORDER_DATA] order_data: {}".format(order_data))
    print("[ORDER_DATA] order_data: {}".format(order_data))
    return order_data

def metaDataExists(metadata):
    if 'order_id' in metadata:
        return True
    else:
        return False

def updateOrderStatus(order_id, status):
    # Update the order status in DynamoDB
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['ORDERS_TABLE'])
    response = table.update_item(
        Key={
            'order_id': order_id
        },
        UpdateExpression="set order_status = :s",
        ExpressionAttributeValues={
            ':s': status
        },
        ReturnValues="UPDATED_NEW"
    )
    logger.debug("[UPDATE_ORDER_STATUS] response: {}".format(response))
    print("[UPDATE_ORDER_STATUS] response: {}".format(response))