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
            }
        }

        // Zips up the folders
        stage("build") {
            steps {
                script {
                    echo "Building ${BRANCH_NAME}"

                    zip archive: true, dir: "lambda/CreateShippo", overwrite: true, zipFile: "CreateShippo.zip"
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
                        credentialsId: "AWS-admin",
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        AWS("s3 cp CreateShippo.zip s3://pbustos-cmpe281-assignment2")
                        AWS("lambda update-function-code --function-name cmpe272-shippo-create --s3-bucket pbustos-cmpe281-assignment2 --s3-key CreateShippo.zip")
                    }
                }
            }
        }
    }
}