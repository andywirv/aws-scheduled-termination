Shutdown/stop AWS EC2 instances based on the presence and value of a tag called scheduled_shutdown

Install
```Shell
git clone git@github.com:andywirv/aws-scheduled-termination.git
cd aws-scheduled-termination
npm install
```
Test locally
```Shell
npm run runlocal
```

Upload to AWS
```Shell
npm run zip
npm run create_lambda
```

Update in AWS after changes
```Shell
npm run update_lambda
```


Prerequisite

To execute locally and to upload to AWS you must have AWS credentials configured in your profile. This is default behaviour of the AWS SDK and Cli. refer to AWS Documentation http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#cli-config-files

You must create an IAM role (or use one of the AWS provided ones) with permissions at least as shown below. the creatLambda.sh file is looking for an environment variable called $AWS_LAMBDA_IAM_ROLE. set this with the ARN of the IAM role you want the function to us

```Shell
export AWS_LAMBDA_IAM_ROLE=[ARN HERE]
```

This function requires these permissions to run.
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Sid": "Stmt1458219601000",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceStatus",
                "ec2:DescribeTags",
                "ec2:StopInstances"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

In order for instances to be shutdown you need to schedule a trigger. This can be whatever you like but the simplest is an AWS CLoudwatch event rule. e.g. Run every 1 or 5 minutes
