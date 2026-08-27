import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';

export class ExpiryDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // 1. DynamoDB 테이블
    // ============================================================
    const table = new dynamodb.Table(this, 'ItemsTable', {
      tableName: 'expiry-dashboard-items',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'category-expiryDate-index',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'expiryDate', type: dynamodb.AttributeType.STRING },
    });

    // ============================================================
    // 2. S3 버킷 (이미지 저장)
    // ============================================================
    const imageBucket = new s3.Bucket(this, 'ImageBucket', {
      bucketName: `expiry-dashboard-images-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    // 이미지 퍼블릭 읽기 허용
    imageBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [imageBucket.arnForObjects('items/*')],
      principals: [new iam.AnyPrincipal()],
    }));

    // ============================================================
    // 3. Lambda IAM Role
    // ============================================================
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    table.grantReadWriteData(lambdaRole);
    imageBucket.grantReadWrite(lambdaRole);
    imageBucket.grantPutAcl(lambdaRole);

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:Converse', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['*'],
    }));

    // Marketplace 권한 (OpenAI 모델 첫 호출 시 자동 구독 필요)
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['aws-marketplace:ViewSubscriptions', 'aws-marketplace:Subscribe', 'aws-marketplace:Unsubscribe'],
      resources: ['*'],
    }));

    // ============================================================
    // 4. Lambda 함수들 (NodejsFunction - esbuild 번들링)
    // ============================================================
    const backendPath = path.join(__dirname, '../../backend/lambda');

    const projectRoot = path.join(__dirname, '../..');

    const commonBundling: lambdaNodejs.BundlingOptions = {
      format: lambdaNodejs.OutputFormat.ESM,
      mainFields: ['module', 'main'],
      esbuildArgs: { '--platform': 'node' },
      banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    };

    const lambdaEnvironment = {
      TABLE_NAME: table.tableName,
      IMAGE_BUCKET: imageBucket.bucketName,
      BEDROCK_MODEL_ID: 'global.openai.gpt-5.6-terra',
    };

    // Items Lambda
    const itemsLambda = new lambdaNodejs.NodejsFunction(this, 'ItemsLambda', {
      functionName: 'expiry-dashboard-items',
      projectRoot,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(backendPath, 'items/handler.ts'),
      handler: 'handler',
      bundling: commonBundling,
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Chat Lambda
    const chatLambda = new lambdaNodejs.NodejsFunction(this, 'ChatLambda', {
      functionName: 'expiry-dashboard-chat',
      projectRoot,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(backendPath, 'chat/handler.ts'),
      handler: 'handler',
      bundling: commonBundling,
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
    });

    // Image Analysis Lambda
    const imageLambda = new lambdaNodejs.NodejsFunction(this, 'ImageLambda', {
      functionName: 'expiry-dashboard-image',
      projectRoot,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(backendPath, 'image/handler.ts'),
      handler: 'handler',
      bundling: commonBundling,
      environment: lambdaEnvironment,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    // Location Lambda
    const locationLambda = new lambdaNodejs.NodejsFunction(this, 'LocationLambda', {
      functionName: 'expiry-dashboard-location',
      projectRoot,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(backendPath, 'location/handler.ts'),
      handler: 'handler',
      bundling: commonBundling,
      environment: {
        ...lambdaEnvironment,
        KAKAO_API_KEY: process.env.KAKAO_REST_API_KEY || '',
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // ============================================================
    // 5. API Gateway
    // ============================================================
    const api = new apigateway.RestApi(this, 'DashboardApi', {
      restApiName: 'expiry-dashboard-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const apiResource = api.root.addResource('api');
    const itemsResource = apiResource.addResource('items');
    const itemIdResource = itemsResource.addResource('{id}');
    const archiveExpiredResource = itemsResource.addResource('archive-expired');
    const restoreResource = itemIdResource.addResource('restore');

    const itemsIntegration = new apigateway.LambdaIntegration(itemsLambda);
    itemsResource.addMethod('GET', itemsIntegration);
    itemsResource.addMethod('POST', itemsIntegration);
    itemIdResource.addMethod('GET', itemsIntegration);
    itemIdResource.addMethod('PUT', itemsIntegration);
    itemIdResource.addMethod('DELETE', itemsIntegration);
    archiveExpiredResource.addMethod('POST', itemsIntegration);
    restoreResource.addMethod('PATCH', itemsIntegration);

    const chatResource = apiResource.addResource('chat');
    const chatIntegration = new apigateway.LambdaIntegration(chatLambda);
    chatResource.addMethod('POST', chatIntegration);

    const chatImageResource = chatResource.addResource('image');
    const imageIntegration = new apigateway.LambdaIntegration(imageLambda);
    chatImageResource.addMethod('POST', imageIntegration);

    const locationsResource = apiResource.addResource('locations');
    const brandResource = locationsResource.addResource('{brand}');
    const locationIntegration = new apigateway.LambdaIntegration(locationLambda);
    brandResource.addMethod('GET', locationIntegration);

    // ============================================================
    // 6. 프론트엔드 (S3 + CloudFront)
    // ============================================================
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `expiry-dashboard-frontend-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const distribution = new cloudfront.Distribution(this, 'FrontendCDN', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: '프론트엔드 CloudFront URL',
    });

    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'ImageBucketName', { value: imageBucket.bucketName });
  }
}
