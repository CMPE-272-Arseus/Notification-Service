import json
import logging
import boto3
import os

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

### Simple Lambda webhook response. Typically returns 200 unless something in the backend is wrong like a missing order_id or user_id.
def lambda_handler(event, context):
    eventBody = event
    if type(eventBody) == str:
        eventBody = json.loads(eventBody)
    if 'body' in event.keys():
        eventBody = event['body']
    logger.debug("[EVENT] event type: {}".format(type(eventBody)))
    if type(eventBody) == str:
        eventBody = json.loads(eventBody)
    logger.debug("[EVENT] event: {}".format(eventBody))
    logger.debug("[EVENT] event type: {}".format(type(eventBody)))
    logger.debug("[TRACKER] event: {}".format(eventBody['event']))
    logger.debug("[TRACKER_DATA] data: {}".format(eventBody['data']))

    print("[TRACKER_DATA] tracking_status: {}".format(eventBody['data']['tracking_status']))
    print("[TRACKER_DATA] tracking_number: {}".format(eventBody['data']['tracking_number']))
    print("[TRACKER_DATA] metadata: ".format(eventBody['data']['metadata']))

    order_id = None
    if metaDataExists(eventBody['data']['metadata']):
        logger.debug("[META_DATA] metadata: {}".format(eventBody['data']['metadata']))
        metadata = json.loads(eventBody['data']['metadata'])
        order_id = metadata['order_id']
    else:
        logger.error("[ERROR] metadata does not exist in request")
        raise Exception("metadata does not exist in request")
    
    # Get the Shippo order data from DynamoDB using the data from the metadata field
    order_data = getOrderResponse(order_id)
    logger.debug("[ORDER_DATA] order_data: {}".format(order_data))
    print("[ORDER_DATA] order_data: {}".format(order_data))

    email = getEmail(order_data['userId'])
    order_id = order_data['orderId']
    tracking_number = order_data['trackingNumber']
    tracking_url = order_data['trackingUrl']

    logger.debug("[TRACKING_STATUS] data type: {}".format(type(eventBody['data'])))
    logger.debug("[TRACKING_STATUS] data value: {}".format(eventBody['data']))

    logger.debug("[TRACKING_STATUS] tracking_status type: {}".format(type(eventBody['data']['tracking_status'])))
    logger.debug("[TRACKING_STATUS] tracking_status value: {}".format(eventBody['data']['tracking_status']))
    tracking_status = eventBody['data']['tracking_status']
    if (type(eventBody['data']['tracking_status']) == dict):
        tracking_status = eventBody['data']['tracking_status']['status']
    logger.debug("[TRACKING_STATUS] tracking_status value: {}".format(tracking_status))
    sendOrderUpdateEmail(email, tracking_number, tracking_status, order_id, tracking_url)
    tracking_status = convertStatus(tracking_status)
    if (tracking_status == -1):
        logger.error("[ERROR] Unable to convert status")
        raise Exception("Unable to convert status")
    updateOrderStatus(order_id, tracking_status)

    return {
        'statusCode': 200,
        'body': json.dumps('Sent notification email to {}'.format(email))
    }

### HELPER FUNCTIONS ###

# Get the user data from DynamoDB using the user_id
def getEmail(user_id):
    logger.debug("[GET_EMAIL]")
    dynamodb = boto3.resource('dynamodb')
    try:
        table = dynamodb.Table(os.environ['USERS_TABLE'])
        response = table.query(
            Select='ALL_ATTRIBUTES',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('UserID').eq(user_id),
        )
        logger.debug("[GET_EMAIL] response: {}".format(response))
        if "Items" not in response:
            logger.error("[ERROR] User data not found")
            raise Exception("User data not found")
        user_data = response['Items']
        logger.debug("[GET_EMAIL] user_data: {}".format(user_data))
        logger.debug("[GET_EMAIL] user_data[0]: {}".format(user_data[0]))
        return user_data[0]['Email']
    except Exception as e:
        logger.error("[ERROR] Unable to get user data. Error: {}".format(e))
        raise Exception("Unable to get user data")

# Get the order data from DynamoDB using the order_id
def getOrderResponse(order_id):
    logger.debug("[GET_ORDER_RESPONSE]")
    dynamodb = boto3.resource('dynamodb')
    try:
        table = dynamodb.Table(os.environ['ORDERS_TABLE'])
        response = table.query(
            Select='ALL_ATTRIBUTES',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('orderId').eq(order_id)
        )
        if "Items" not in response:
            logger.error("[ERROR] Order data not found")
            raise Exception("Order data not found")
        order_data = response['Items']
        logger.debug("[GET_ORDER_RESPONSE] order_data: {}".format(order_data))
        logger.debug("[GET_ORDER_RESPONSE] order_data[0]: {}".format(order_data[0]))
        return order_data[0]
    except Exception as e:
        logger.error("[ERROR] Unable to get order data. Error: {}".format(e))
        raise Exception("Unable to get order data")

def metaDataExists(metadata):
    logger.debug("[META_DATA_EXISTS] metadata: {}".format(metadata))
    if 'order_id' in metadata:
        return True
    else:
        return False

# Update the order status in DynamoDB
def updateOrderStatus(order_id, status):
    logger.debug("[UPDATE_ORDER_STATUS] order_id: {}".format(order_id))
    dynamodb = boto3.resource('dynamodb')
    try:
        table = dynamodb.Table(os.environ['ORDERS_TABLE'])
        response = table.update_item(
            Key={
                'orderId': order_id
            },
            UpdateExpression="set shipping = :n",
            ExpressionAttributeValues={
                ':n': status
            },
            ReturnValues="UPDATED_NEW"
        )
        logger.debug("[UPDATE_ORDER_STATUS] response: {}".format(response))
        print("[UPDATE_ORDER_STATUS] response: {}".format(response))
    except Exception as e:
        logger.error("[ERROR] Unable to update order status. Error: {}".format(e))
        raise Exception("Unable to update order status")

# Send an email to the user with the tracking status update for the order and tracking number
def sendOrderUpdateEmail(receipient, tracking_number, status, order_id, url):
    logger.debug("[SEND_ORDER_UPDATE_EMAIL] receipient: {} tracking_number: {}".format(receipient, tracking_number))
    logger.debug("[SEND_ORDER_UPDATE_EMAIL] status: {} order_id: {}".format(status, order_id))
    ses = boto3.client('ses')
    try:
        response = ses.send_email(Source=os.environ['SES_SENDER'],
            Destination={
                'ToAddresses': [
                    receipient,
                ],
            },
            Message={
                'Body': {
                    'Text': {
                        'Charset': 'UTF-8',
                        'Data': 'Your order {} has been updated! Your order status is now {}.\nTracking number: {}\nTracking URL: {}'.format(order_id, status, tracking_number, url),
                    },
            },
            'Subject': {
                    'Charset': 'UTF-8',
                    'Data': 'Your order status has been updated!',
                },
            })
        logger.debug("[SEND_ORDER_UPDATE_EMAIL] response: {}".format(response))
    except Exception as e:
        logger.error("[ERROR] Unable to send email. Error: {}".format(e))
        raise Exception("Unable to send email")

def convertStatus(status):
    logger.debug("[CONVERT_STATUS] status: {}".format(status))
    if status == 'UNKOWN':
        return 0
    elif status == 'PRE_TRANSIT':
        return 1
    elif status == 'TRANSIT':
        return 2
    elif status == 'DELIVERED':
        return 3
    elif status == 'RETURNED':
        return 4
    elif status == 'FAILURE':
        return 5
    return -1