import json
import os
import boto3
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# Replace sender@example.com with your "From" address.
# This address must be verified with Amazon SES.
SENDER = os.environ['SES_SENDER']

def lambda_handler(event, context):
    # TODO implement
    email_address = event['queryStringParameters']['email']
    # Replace recipient@example.com with a "To" address. If your account 
    # is still in the sandbox, this address must be verified.
    RECIPIENT = email_address
    # Create a new SES resource and specify a region.
    client = boto3.client('ses')
   
    # Try to send the email.
    try:
        #Provide the contents of the email.
        sendInviteEmail(RECIPIENT)
        return {
        'statusCode': 200,
        'body': json.dumps('Sent notification email to {}'.format(email_address)),
        'headers': {
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            'Access-Control-Allow-Credentials': True
        }
        }
    # Display an error if something goes wrong.	
    except ClientError as e:
        print(e.response['Error']['Message'])
    else:
        print("Email sent! Message ID:"),
        print(response['MessageId'])

def sendInviteEmail(receipient):
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
                        'Data': 'Hi!\nYou\'ve been invited to sign up to our site! Click here {}'.format(os.environ['SITE_URL']),
                    },
            },
            'Subject': {
                    'Charset': 'UTF-8',
                    'Data': 'Invite to PhotoPrintStore',
                },
            })
        logger.debug("[SEND_ORDER_UPDATE_EMAIL] response: {}".format(response))
    except Exception as e:
        logger.error("[ERROR] Unable to send email. Error: {}".format(e))
        raise Exception("Unable to send email")