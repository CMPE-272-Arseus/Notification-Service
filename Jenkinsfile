@Library('github.com/releaseworks/jenkinslib') _

pipeline {

    // Where to execute the pipeline script
    agent any

    environment{
        AWS_DEFAULT_REGION="us-west-2"
        AWS_CREDENTIALS=credentials('AWS-admin')
    }

    // Different pipeline stages
    stages {
        stage("init") {
            steps {
                script {
                    echo "Initializing Pipeline"
                    echo "Installing Node Packages"
                }
                dir("lambda/CreateShippo") {
                    nodejs("Node-16.13") {
                        sh "npm install"
                        echo "Packages Installed"
                    }
                }
                dir("lambda/GetOrderStatus") {
                    nodejs("Node-16.13") {
                        sh "npm install"
                        echo "Packages Installed"
                    }
                }
            }
        }

        // Zips up the folders
        stage("build") {
            steps {
                script {
                    echo "Building ${BRANCH_NAME}"

                    zip archive: true, dir: "lambda/CreateShippo", overwrite: true, zipFile: "CreateShippo.zip"
                    zip archive: true, dir: "lambda/Webhook", overwrite: true, zipFile: "ShippoWebhook.zip"
                    zip archive: true, dir: "lambda/GetOrderStatus", overwrite: true, zipFile: "GetOrderStatus.zip"
                }
            }
        }

        // Uploads zipped folders to Lambda directly if under 10MB
        stage("dev-deploy") {
            steps {
                script {
                    
                    withCredentials([
                        string(credentialsId: 'cmpe272-dev-bucket', variable: 'BUCKET'), 
                        string(credentialsId: 'cmpe272-dev-lambda', variable: 'LAMBDA'),
                        string(credentialsId: 'cmpe272-dev-lambda-webhook', variable: 'LAMBDA2'),
                        string(credentialsId: 'cmpe272-dev-lambda-get-order-update', variable: 'LAMBDA3'),
                        [
                            $class: 'AmazonWebServicesCredentialsBinding',
                            credentialsId: "AWS-admin",
                            accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                            secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                        ]
                    ]
                    ) {
                        echo "Deploying ${BRANCH_NAME} onto $LAMBDA"
                        AWS("s3 cp CreateShippo.zip s3://$BUCKET")
                        AWS("s3 cp ShippoWebhook.zip s3://$BUCKET")
                        AWS("s3 cp GetOrderStatus.zip s3://$BUCKET")
                        AWS("lambda update-function-code --function-name $LAMBDA --s3-bucket $BUCKET --s3-key CreateShippo.zip")
                        AWS("lambda update-function-code --function-name $LAMBDA2 --s3-bucket $BUCKET --s3-key ShippoWebhook.zip")
                        AWS("lambda update-function-code --function-name $LAMBDA3 --s3-bucket $BUCKET --s3-key GetOrderStatus.zip")
                    }
                }
            }
        }
        stage("prod-deploy") {
            steps {
                script {
                    
                    withCredentials([
                        string(credentialsId: 'cmpe272-prod-bucket', variable: 'BUCKET'), 
                        string(credentialsId: 'cmpe272-prod-lambda-create', variable: 'LAMBDA'),
                        string(credentialsId: 'cmpe272-prod-lambda-webhook', variable: 'LAMBDA2'),
                        string(credentialsId: 'cmpe272-prod-lambda-get-order-update', variable: 'LAMBDA3'),
                        [
                            $class: 'AmazonWebServicesCredentialsBinding',
                            credentialsId: "AWS-CMPE272",
                            accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                            secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                        ]
                    ]
                    ) {
                        echo "Deploying ${BRANCH_NAME} onto $LAMBDA"
                        AWS("s3 cp CreateShippo.zip s3://$BUCKET")
                        AWS("s3 cp ShippoWebhook.zip s3://$BUCKET")
                        AWS("s3 cp GetOrderStatus.zip s3://$BUCKET")
                        AWS("lambda update-function-code --function-name $LAMBDA --s3-bucket $BUCKET --s3-key CreateShippo.zip")
                        AWS("lambda update-function-code --function-name $LAMBDA2 --s3-bucket $BUCKET --s3-key ShippoWebhook.zip")
                        AWS("lambda update-function-code --function-name $LAMBDA3 --s3-bucket $BUCKET --s3-key GetOrderStatus.zip")
                    }
                }
            }
        }
    }
}
