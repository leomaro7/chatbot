import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppCdkStack } from '../lib/app-cdk-stack';
import { PipelineCdkStack } from '../lib/pipeline-cdk-stack'
import { EcrCdkStack } from '../lib/ecr-cdk-stack';

const app = new cdk.App();

const ecrCdkStack = new EcrCdkStack(app, 'ecr-stack', {});

const testAppCdkStack = new AppCdkStack(app, 'test', { ecrRepo: ecrCdkStack.ecrRepo});

const pipelineCdkStack = new PipelineCdkStack(app, "pipeline-stack", {
  ecrRepo: ecrCdkStack.ecrRepo,
});