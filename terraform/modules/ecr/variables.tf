variable "repository_name" {
  description = "The name of the ECR repository"
  type        = string
  default     = "my-webapp"
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
