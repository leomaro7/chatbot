import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';

export class PipelineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const codeCommitRepo= new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: 'chatbot',
    });

    new CfnOutput(this, 'CodeCommitRepoUrl', {
      value: codeCommitRepo.repositoryCloneUrlGrc,
    });
  }
}