import logging
import uuid
from typing import BinaryIO

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import ClientError

from src.settings import config

logger = logging.getLogger(__name__)


class S3Storage:
    """Handle S3 storage operations for images."""

    def __init__(self):
        # Configure boto3 client for AWS S3
        self.client = boto3.client(
            's3',
            region_name=config.s3_region,
            aws_access_key_id=config.s3_access_key,
            aws_secret_access_key=config.s3_secret_key,
            config=BotoConfig(
                signature_version='s3v4',
                retries={'max_attempts': 3}
            )
        )
        self.bucket_name = config.s3_bucket_name
        self._verify_bucket_access()

    def _verify_bucket_access(self):
        """Verify we can access the S3 bucket."""
        logger.info("=" * 50)
        logger.info("S3 Storage Initialization")
        logger.info("=" * 50)
        logger.info(f"Bucket: {self.bucket_name}")
        logger.info(f"Region: {config.s3_region}")
        logger.info(f"Access Key: {config.s3_access_key[:4]}..." if config.s3_access_key else "Not set")

        try:
            # Try to list objects (with max 1 result) to verify bucket access
            # This is more lenient than HeadBucket for permissions
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                MaxKeys=1
            )

            # Count objects in bucket (from this request)
            object_count = response.get('KeyCount', 0)

            logger.info("✅ S3 Connection Status: SUCCESS")
            logger.info(f"✅ Bucket '{self.bucket_name}' is accessible")
            if object_count > 0:
                logger.info(f"✅ Bucket contains objects (found at least {object_count})")
            else:
                logger.info("✅ Bucket is empty or no objects found")
            logger.info("=" * 50)

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error("❌ S3 Connection Status: FAILED")
            logger.error(f"❌ Error Code: {error_code}")
            logger.error("=" * 50)

            if error_code == 'NoSuchBucket':
                raise ValueError(
                    f"S3 bucket '{self.bucket_name}' does not exist. "
                    f"Please create the bucket in region '{config.s3_region}' first."
                )
            elif error_code in ('403', 'AccessDenied'):
                raise ValueError(
                    f"Access denied to S3 bucket '{self.bucket_name}'. "
                    "Please check:\n"
                    "1. Your AWS credentials (S3_ACCESS_KEY and S3_SECRET_KEY)\n"
                    "2. The bucket name is correct\n"
                    "3. Your IAM user has s3:ListBucket permission\n"
                    f"4. The bucket is in region '{config.s3_region}'"
                )
            else:
                raise ValueError(
                    f"Failed to access S3 bucket '{self.bucket_name}': {str(e)}"
                )

    def upload_image(self, file_data: BinaryIO, content_type: str,
                    original_filename: str) -> tuple[str, str]:
        """
        Upload an image to S3.

        Args:
            file_data: Binary file data
            content_type: MIME type of the image
            original_filename: Original filename for metadata

        Returns:
            Tuple of (s3_key, s3_url)
        """
        # Generate unique key
        file_extension = original_filename.split('.')[-1] if '.' in original_filename else 'png'
        s3_key = f"uploads/{uuid.uuid4()}.{file_extension}"

        # Upload to S3
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_data,
                ContentType=content_type,
                Metadata={
                    'original_filename': original_filename,
                    'upload_timestamp': str(uuid.uuid4())
                }
            )
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '403':
                raise ValueError(
                    f"Access denied to S3 bucket '{self.bucket_name}'. "
                    "Please check your AWS credentials and bucket permissions."
                )
            elif error_code == 'NoSuchBucket':
                raise ValueError(
                    f"S3 bucket '{self.bucket_name}' does not exist. "
                    "Please create the bucket first."
                )
            else:
                raise

        # Generate AWS S3 URL
        s3_url = f"https://{self.bucket_name}.s3.{config.s3_region}.amazonaws.com/{s3_key}"

        return s3_key, s3_url

    def download_image(self, s3_key: str) -> bytes:
        """
        Download an image from S3.

        Args:
            s3_key: S3 object key

        Returns:
            Binary image data
        """
        response = self.client.get_object(Bucket=self.bucket_name, Key=s3_key)
        return response['Body'].read()

    def delete_image(self, s3_key: str):
        """Delete an image from S3."""
        self.client.delete_object(Bucket=self.bucket_name, Key=s3_key)

    def get_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for downloading.

        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds

        Returns:
            Presigned URL
        """
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': s3_key},
            ExpiresIn=expiration
        )


# Global storage instance
storage = S3Storage()
