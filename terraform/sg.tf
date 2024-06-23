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
