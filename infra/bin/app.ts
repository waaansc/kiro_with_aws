#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ExpiryDashboardStack } from '../lib/stack';

const app = new cdk.App();

new ExpiryDashboardStack(app, 'ExpiryDashboardStack', {
  env: {
    account: '962500057795',
    region: 'ap-northeast-2',
  },
});
