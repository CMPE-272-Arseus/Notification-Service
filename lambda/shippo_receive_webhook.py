import json
import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

def lambda_handler(event, context):
    logger.debug("[EVENT] event: {}".format(event))
    logger.debug("[TRACKER] event metadata: {}".format(event['metadata']))
    logger.debug("[TRACKER] event: {}".format(event['event']))
    logger.debug("[TRACKER_DATA] tracking_number: {}".format(event['data']['tracking_number']))
    logger.debug("[TRACKER_DATA] transaction_number: {}".format(event['data']['transaction']))
    logger.debug("[TRACKER_DATA] tracking_status: {}".format(event['data']['tracking_status']))
    logger.debug("[TRACKER_DATA] metadata: {}".format(event['data']['metadata']))

    print("[TRACKER_DATA] tracking_status: {}".format(event['data']['tracking_status']))
    print("[TRACKER_DATA] tracking_number: {}".format(event['data']['tracking_number']))
    print("[TRACKER_DATA] metadata: ".format(event['data']['metadata']))
    email = 'test@gmail.com'
    return {
        'statusCode': 200,
        'body': json.dumps('Sent notification email to {}'.format(email))
    }
