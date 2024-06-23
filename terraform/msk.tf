resource "aws_msk_cluster" "kafka" {
  cluster_name           = "${var.env}-msk-cluster"
  kafka_version          = "2.8.1"
  number_of_broker_nodes = 2

  broker_node_group_info {
    instance_type  = "kafka.m5.large"
    client_subnets = ["subnet-0c5095147f2d4e404", "subnet-0fe29004b8d7c33da", "subnet-087974ba673aacc92"]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }

    security_groups = [
      aws_security_group.msk_sg.id
    ]

    encryption_info {
      encryption_at_rest_kms_key_arn = aws_kms_key.kafka_encryption.arn
    }

    logging_info {
      broker_logs {
        cloudwatch_logs {
          enabled   = true
          log_group = aws_cloudwatch_log_group.kafka_logs.name
        }
      }
    }

    tags = local.tags

  }
}

resource "aws_security_group" "msk_sg" {
  name        = "${var.env}-msk-cluster-SG"
  description = "Security group for MSK cluster"
}


resource "aws_vpc_security_group_ingress_rule" "allow_kafka" {
  security_group_id = aws_security_group.msk_sg.id
  cidr_ipv4         = "45.88.220.125"
  from_port         = 9092
  ip_protocol       = "tcp"
  to_port           = 9092
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_eg" {
  security_group_id = aws_security_group.msk_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
