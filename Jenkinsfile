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
                     withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: "aws-admin",
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        AWS("s3 ls")
                    }
                }
            }
        }

        // Zips up the folders
        stage("build") {
            steps {
                script {
                    echo "Building ${BRANCH_NAME}"
                    zip archive: true, dir: "lambda/CreateShippo", overwrite: true, zipFileName: "CreateShippo.zip"
                }
            }
        }

        // Uploads zipped folders to Lambda directly if under 10MB
        stage("deploy") {
            steps {
                script {
                    echo "Deploying ${BRANCH_NAME} onto cmpe272-shippo-create"
                    withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: "aws-admin",
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        AWS("lambda update-function-code --function-name cmpe272-shippo-create --zip-file fileb://CreateShippo.zip")
                    }
                }
            }
        }
    }
}