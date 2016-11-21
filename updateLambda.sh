#!/usr/bin/env bash
lamda_function_name="stopTaggedEC2Instances"
zip_file_path="./function.zip"
aws lambda update-function-code --function-name=$lamda_function_name --zip-file=fileb://$zip_file_path
