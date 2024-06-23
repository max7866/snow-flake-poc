resource "aws_cloudwatch_log_group" "kafka_logs" {
  name = "${var.env}-Kafka-Logs"

  tags = local.tags
}
