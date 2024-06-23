resource "aws_s3_bucket" "object_storage" {
  bucket = "${var.env}-kafka-object-storage"

  tags = local.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "bucket-config" {
  bucket = aws_s3_bucket.object_storage.id

  rule {
    id = "delete_after7"

    expiration {
      days = 7
    }

  }

  status = "Enabled"

}

resource "aws_s3_bucket_public_access_block" "bucket_acces_block" {
  bucket = aws_s3_bucket.object_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
