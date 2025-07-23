#!/usr/bin/env python3
"""
Script to check S3 configuration and permissions.
"""
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3
from botocore.exceptions import ClientError

from src.settings import config


def check_s3_config():
    """Check S3 configuration and permissions."""
    print("🔍 Checking S3 Configuration...\n")

    # Check environment variables
    print("1. Environment Variables:")
    print(f"   S3_ACCESS_KEY: {'✓ Set' if config.s3_access_key else '✗ Missing'}")
    print(f"   S3_SECRET_KEY: {'✓ Set' if config.s3_secret_key else '✗ Missing'}")
    print(f"   S3_BUCKET_NAME: {config.s3_bucket_name}")
    print(f"   S3_REGION: {config.s3_region}")
    print()

    if not config.s3_access_key or not config.s3_secret_key:
        print("❌ Missing AWS credentials. Please set S3_ACCESS_KEY and S3_SECRET_KEY")
        return

    # Create S3 client
    print("2. Creating S3 Client:")
    s3 = boto3.client(
        's3',
        region_name=config.s3_region,
        aws_access_key_id=config.s3_access_key,
        aws_secret_access_key=config.s3_secret_key
    )
    print("   ✓ S3 client created")

    # Check specific bucket
    print(f"\n3. Checking Bucket '{config.s3_bucket_name}':")
    try:
        # Try ListObjectsV2 (more lenient than HeadBucket)
        s3.list_objects_v2(
            Bucket=config.s3_bucket_name,
            MaxKeys=1
        )
        print("   ✓ Bucket exists and is accessible")

        # Check if bucket is in the right region
        try:
            bucket_location = s3.get_bucket_location(Bucket=config.s3_bucket_name)
            location = bucket_location.get('LocationConstraint') or 'us-east-1'
            if location != config.s3_region:
                print(f"   ⚠️  Warning: Bucket is in region '{location}' but S3_REGION is '{config.s3_region}'")
                print(f"   Consider updating S3_REGION to '{location}'")
        except ClientError:
            print("   ℹ️  Could not check bucket region (permission denied)")

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            print("   ✗ Bucket does not exist")
            print(f"   Please create bucket '{config.s3_bucket_name}' in region '{config.s3_region}'")
        elif error_code in ('403', 'AccessDenied'):
            print("   ✗ Access denied to bucket")
            print("   Your IAM user needs these permissions:")
            print("   - s3:ListBucket on arn:aws:s3:::locofy-homework")
            print("   - s3:GetObject on arn:aws:s3:::locofy-homework/*")
            print("   - s3:PutObject on arn:aws:s3:::locofy-homework/*")
        else:
            print(f"   ✗ Error: {e}")
        return

    # Test upload permission
    print("\n4. Testing Upload Permission:")
    test_key = 'test/permission-check.txt'
    try:
        s3.put_object(
            Bucket=config.s3_bucket_name,
            Key=test_key,
            Body=b'Test upload',
            ContentType='text/plain'
        )
        print("   ✓ Successfully uploaded test file")

        # Clean up test file
        s3.delete_object(Bucket=config.s3_bucket_name, Key=test_key)
        print("   ✓ Successfully deleted test file")

    except ClientError as e:
        print(f"   ✗ Upload failed: {e}")
        print("   Your IAM user needs 's3:PutObject' permission")

    print("\n✅ S3 configuration check complete!")


if __name__ == "__main__":
    check_s3_config()
