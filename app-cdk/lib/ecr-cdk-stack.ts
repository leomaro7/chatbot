import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";

export class EcrCdkStack extends Stack {
    public readonly ecrRepo: ecr.Repository;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

    this.ecrRepo = new ecr.Repository(this, "EcrRepo");

    }
}