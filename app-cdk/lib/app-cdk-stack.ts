import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";

interface ConsumerProps extends StackProps {
  ecrRepo: ecr.Repository;
}

export class AppCdkStack extends Stack {
  public readonly albFargateService: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: ConsumerProps) {
    super(scope, `${id}-app-stack`, props);

    const vpc = new ec2.Vpc(this, `${id}Vpc`);

    const ecsCluster = new ecs.Cluster(this, `${id}EcsCluster`, {
      vpc: vpc,
    });

    this.albFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      `${id}albFargateService`,
      {
        cluster: ecsCluster,
        publicLoadBalancer: true,
        memoryLimitMiB: 1024,
        cpu: 512,
        desiredCount: 1,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(props.ecrRepo),
          containerName: 'app-streamlit',
          containerPort: 8501,
        },
      }
    );

    this.albFargateService.targetGroup.configureHealthCheck({
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      timeout: Duration.seconds(10),
      interval:Duration.seconds(11)
    });
    
    this.albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '5');
  }
}