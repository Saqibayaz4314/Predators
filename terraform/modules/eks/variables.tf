variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "eks-prod-cluster"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
type = string
  default     = "1.36"
}

variable "subnet_ids" {
  description = "Subnet IDs where EKS cluster and node group should be deployed"
  type        = list(string)
}

variable "node_instance_types" {
  description = "Instance types for the EKS managed node group"
  type        = list(string)
  default     = ["c7i-flex.large"]
}

variable "desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 4
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
