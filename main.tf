terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ── Security Group ────────────────────────────────────────────────────────────

resource "aws_security_group" "log_monitor_sg" {
  name        = "log-monitor-sg"
  description = "Allow HTTP, app ports, and SSH"

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend (Nginx on port 80)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Flask backend
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "log-monitor-sg"
  }
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "log_monitor" {
  ami                    = "ami-0c55b159cbfafe1f0"   # Ubuntu 22.04 LTS (us-east-1)
  instance_type          = "t2.medium"               # Enough RAM for MongoDB + Flask + Nginx
  vpc_security_group_ids = [aws_security_group.log_monitor_sg.id]
  key_name               = var.key_pair_name

  # Install Docker and Docker Compose on first boot
  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y docker.io git

    # Install Docker Compose v2
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    # Allow ubuntu user to run docker
    usermod -aG docker ubuntu

    # Clone project and start containers
    su ubuntu -c "git clone https://github.com/${var.github_username}/${var.github_repo}.git ~/log-monitoring-dashboard"
    su ubuntu -c "cd ~/log-monitoring-dashboard && docker compose up -d --build"
  EOF

  tags = {
    Name = "log-monitoring-dashboard"
  }
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "key_pair_name" {
  description = "Name of your AWS key pair for SSH access"
  type        = string
}

variable "github_username" {
  description = "Your GitHub username"
  type        = string
}

variable "github_repo" {
  description = "Your GitHub repository name"
  type        = string
  default     = "log-monitoring-dashboard"
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "ec2_public_ip" {
  description = "Public IP of your EC2 instance"
  value       = aws_instance.log_monitor.public_ip
}

output "dashboard_url" {
  description = "URL to access the dashboard"
  value       = "http://${aws_instance.log_monitor.public_ip}"
}
