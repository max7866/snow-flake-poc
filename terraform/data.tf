data "aws_caller_identity" "current" {}

data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket         = "wkc-terraform-states"
    key            = "mg-shs-vpc.tfstate"
    dynamodb_table = "wkc-terraform-state-ddb"
    region         = "us-east-1"
  }
}
