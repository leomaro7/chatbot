import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';

interface ConsumerProps extends StackProps {
    ecrRepo: ecr.Repository;
  }

export class PipelineCdkStack extends Stack {
    constructor(scope: Construct, id: string, props: ConsumerProps) {
        super(scope, id, props);
 
    const codeCommitRepo= new codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: 'chatbot',
    });

    const codePipeline = new codepipeline.Pipeline(this, "CodePipeline", {
        pipelineName: "Chatbot_Pipeline",
        crossAccountKeys: false,
      });

    const codeBuildQuality = new codebuild.PipelineProject(
    this,
    "CodeBuildQuality",
    {
        environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_test.yml')
    }
    );

    const codeBuildDocker = new codebuild.PipelineProject(this, 'CodeBuildDocker', {
        environmentVariables: {
          'IMAGE_TAG': { value: 'latest' },
          'IMAGE_REPO_URI': {value: props.ecrRepo.repositoryUri },
          'AWS_DEFAULT_REGION': {value: process.env.CDK_DEFAULT_REGION },
        },
        environment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
          privileged: true,
          computeType: codebuild.ComputeType.LARGE
          },
        buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_docker.yml'),
      });

    const codeBuildRolePolicyDocker =  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: ['*'],
    actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:GetRepositoryPolicy',
        'ecr:DescribeRepositories',
        'ecr:ListImages',
        'ecr:DescribeImages',
        'ecr:BatchGetImage',
        'ecr:InitiateLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:CompleteLayerUpload',
        'ecr:PutImage'
    ]
    });
    
    codeBuildDocker.addToRolePolicy(codeBuildRolePolicyDocker);
    
    const sourceOutput = new codepipeline.Artifact();
    const unitTestOutput = new codepipeline.Artifact();
    const codeBuildDockerOutput = new codepipeline.Artifact();

    codePipeline.addStage({
      stageName: "Source",
      actions: [
        new codepipeline_actions.CodeCommitSourceAction({
          actionName: "CodeCommit",
          repository: codeCommitRepo,
          output: sourceOutput,
          branch: "main",
        }),
      ],
    });

    codePipeline.addStage({
      stageName: "CodeBuildQualityQuality",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "Unit-Test",
          project: codeBuildQuality,
          input: sourceOutput,
          outputs: [unitTestOutput],
        }),
      ],
    });

    codePipeline.addStage({
        stageName: 'Docker-Push-ECR',
        actions: [
          new codepipeline_actions.CodeBuildAction({
            actionName: 'docker-build',
            project: codeBuildDocker,
            input: sourceOutput,
            outputs: [codeBuildDockerOutput],
          }),
        ],
      });      
    
    new CfnOutput(this, 'CodeCommitRepoUrl', {
      value: codeCommitRepo.repositoryCloneUrlGrc,
    });
  }
}