#!/usr/bin/env bash
lambda_function_name="stopTaggedEC2Instances"
zip_file_path="./function.zip"
# set iam_role to the IAM role to be used by the Lambda function. This is the full, account
# specfic ARN of the IAM role
iam_role=$AWS_LAMBDA_IAM_ROLE

aws lambda create-function --function-name=$lambda_function_name --runtime=nodejs4.3 --timeout 30 --role=$iam_role --handler=index.handler --zip-file=fileb://$zip_file_path
