# Notification-Service

## Repository Single Region Architecture
![Notification Architecture](https://i.imgur.com/np4LLD6.png)

## Repository Requirements
  - AWS Account
  - Shippo Account with test API key
  - Email to send Order Status Updates from
  - Node.JS
  - Python 3
    - AWS Boto3 package
  - Optional
    - Jenkins for Continuous Deployment

## Endpoints
  - /tracking/create-shippo/
    - Body
      ```
        "user": {
            "user_id": "",
            "name": "First Last",
            "street1": "123 Baker St.",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94117",
            "country": "US",
            "phone": "+1 555 341 9393",
            "email": "admin@gmail.com"
        },
        "store_id": "0000",
        "parcel": {
            "length": "5",
            "width": "5",
            "height": "5",
            "distance_unit": "in",
            "weight": "2",
            "mass_unit": "lb"
        },
        "orderId": ""
      ```
    - Response
      ```
      {
        "statusCode": 200,
        "body": "{
            "trackingNumber":"",
            "trackingUrl":"",
            "labelUrl":"",
            "orderStatus":"",
            "parcelId":"",
            "rateId":""
        }",
      }
      ```
  - /tracking/get-shippo/
    - Queries
      - orderId=""
      - trackingNumber=""
    - Response
      - [Raw Shippo Response](https://goshippo.com/docs/reference/js#tracks-retrieve)
  - /tracking/webhook
    - Body
      - [Shippo Body](https://goshippo.com/docs/reference/js#tracks-create)
    - Response
      ```
        {
            "statusCode": 200,
            "body": "Sent notification email to {linkedEmail}"
        }
      ```