import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppCdkStack } from '../lib/app-cdk-stack';
import { PipelineCdkStack } from '../lib/pipeline-cdk-stack';
import { EcrCdkStack } from '../lib/ecr-cdk-stack';

const app = new cdk.App();

const ecrCdkStack = new EcrCdkStack(app, 'ecr-stack', {
    // env: {
    //   account: 'XXXXXXXXXXXX',
    //   region: 'us-west-2',
    // },
    description: "ECR repository for chatbot"
});

const testCdkStack = new AppCdkStack(app, 'test', {
    ecrRepo: ecrCdkStack.ecrRepo,
    // env: {
    //   account: 'XXXXXXXXXXXX',
    //   region: 'us-west-2',
    // },
    description: "Test environment for chatbot"
});

const pipelineCdkStack = new PipelineCdkStack(app, 'pipeline-stack', {
    ecrRepo: ecrCdkStack.ecrRepo,
    albFargateServiceTest: testCdkStack.albFargateService,
    // env: {
    //   account: 'XXXXXXXXXXXX',
    //   region: 'us-west-2',
    // },
    description: "Pipeline for chatbot"
});