variable "aws_region" {
  description = "The AWS Region where resources will be provisioned"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Target deployment environment"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "The name of the Amazon EKS cluster"
  type        = string
  default     = "eks-prod-cluster"
}

variable "cluster_version" {
  description = "Kubernetes control plane version"
  type        = string
  default     = "1.36"
}

variable "ecr_repository_name" {
  description = "The name of the Amazon ECR repository"
  type        = string
  default     = "my-webapp"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks (at least 2 AZs for high availability)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "availability_zones" {
  description = "List of AWS Availability Zones"
  type        = list(string)
  default     = ["ap-southeast-2a", "ap-southeast-2b"]
}

variable "node_instance_types" {
  description = "EC2 instance types for the EKS worker nodes"
  type        = list(string)
  default     = ["c7i-flex.large"]
}

variable "desired_node_count" {
  description = "Desired number of worker nodes in the default node group"
  type        = number
  default     = 2
}

variable "min_node_count" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 4
}
