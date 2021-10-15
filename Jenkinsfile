pipeline {

    // Where to execute the pipeline script
    agent any

    // Different pipeline stages
    stages {
        stage("init") {
            steps {
                script {
                    echo "Initializing Pipeline"
                }
            }
        }

        stage("build") {
            // Script executes command on Jenkins agent
            steps {
                script {
                    echo "Building ${BRANCH_NAME}"
                }
            }
        }

        stage("test frontend") {
            steps {
                script {
                    echo "Testing ${BRANCH_NAME}"
                }
            }
        }

        stage("deploy frontend") {
            when {
                expression {
                    (env.BRANCH_NAME == 'main')
                }
            }
            steps {
                script {
                    echo "Deploying ${BRANCH_NAME}"
                }
            }
        }
    }
}