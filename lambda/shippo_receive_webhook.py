import json
import logging
import boto3
import os

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

### Simple Lambda webhook response. Typically returns 200 unless something in the backend is wrong.
def lambda_handler(event, context):
    logger.debug("[EVENT] event: {}".format(event))
    logger.debug("[TRACKER] event metadata: {}".format(event['metadata']))
    logger.debug("[TRACKER] event: {}".format(event['event']))
    logger.debug("[TRACKER_DATA] data: {}".format(event['data']))

    print("[TRACKER_DATA] tracking_status: {}".format(event['data']['tracking_status']))
    print("[TRACKER_DATA] tracking_number: {}".format(event['data']['tracking_number']))
    print("[TRACKER_DATA] metadata: ".format(event['data']['metadata']))

    order_id = None
    if metaDataExists(event['data']['metadata']):
        metadata = event['data']['metadata']
        metadata = metadata.split(' ')
        order_id = metadata[1]
    else:
        logger.error("[ERROR] metadata does not exist in request")
        raise Exception("metadata does not exist in request")
    
    # Get the Shippo order data from DynamoDB using the data from the metadata field
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['ORDERS_TABLE'])
    response = table.get_item(
        Key={
            'order_id': order_id
        }
    )

    if 'Item' not in response:
        print(type(order_id))
        print(order_id)
        logger.error("[ERROR] Order data not found")
        raise Exception("Order data not found")

    order_data = response['Item']
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

def metaDataExists(metadata):
    if 'order_id' in metadata:
        return True
    else:
        return False